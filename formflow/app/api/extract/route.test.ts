import { vi, describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mock the OpenAI SDK ───────────────────────────────────────────────────────
// vi.hoisted ensures this is available when vi.mock factory runs (mock is hoisted above variable decls)
const mockResponsesCreate = vi.hoisted(() => vi.fn());
vi.mock('openai', () => ({
  default: class OpenAI {
    responses = { create: mockResponsesCreate };
  },
}));

// ── Mock fs/promises (server reads /public files directly) ───────────────────
const mockReadFile = vi.hoisted(() => vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake pdf bytes')));
vi.mock('fs/promises', () => ({
  default: { readFile: mockReadFile },
  readFile: mockReadFile,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const minimalSchema = {
  id: 'test',
  title: 'Test Form',
  sections: [
    {
      id: 's1',
      title: 'Section 1',
      fields: [
        {
          id: 'f1',
          label: 'First Name',
          type: 'text',
          required: true,
          page: 1,
          bbox: { page: 1, x: 0.1, y: 0.1, width: 0.2, height: 0.03 },
        },
      ],
    },
  ],
};

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('POST /api/extract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResponsesCreate.mockResolvedValue({
      output_text: JSON.stringify(minimalSchema),
    });
  });

  it('returns 400 when neither pdfUrl nor pdfBase64 is provided', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('calls the OpenAI API with a base64-encoded PDF when given pdfBase64', async () => {
    const { POST } = await import('./route');
    const fakePdf = Buffer.from('%PDF fake').toString('base64');
    await POST(makeRequest({ pdfBase64: fakePdf }));
    expect(mockResponsesCreate).toHaveBeenCalledOnce();
    const call = mockResponsesCreate.mock.calls[0][0];
    const fileBlock = call.input[0].content.find((b: { type: string }) => b.type === 'input_file');
    expect(fileBlock?.file_data).toBe(`data:application/pdf;base64,${fakePdf}`);
  });

  it('calls the OpenAI API with a local file when given a relative pdfUrl', async () => {
    const { POST } = await import('./route');
    await POST(makeRequest({ pdfUrl: '/saws2plus.pdf' }));
    expect(mockResponsesCreate).toHaveBeenCalledOnce();
  });

  it('returns a FormSchema from the OpenAI response', async () => {
    const { POST } = await import('./route');
    const res = await POST(makeRequest({ pdfUrl: '/saws2plus.pdf' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schema.id).toBe('test');
    expect(body.schema.sections[0].fields[0].label).toBe('First Name');
  });

  it('returns 500 when OpenAI returns non-JSON text', async () => {
    mockResponsesCreate.mockResolvedValue({
      output_text: 'Sorry, I cannot process this.',
    });
    const { POST } = await import('./route');
    const res = await POST(makeRequest({ pdfUrl: '/saws2plus.pdf' }));
    expect(res.status).toBe(500);
  });

  it('preserves OpenAI API error status codes', async () => {
    mockResponsesCreate.mockRejectedValue(Object.assign(new Error('Rate limit reached'), { status: 429 }));
    const { POST } = await import('./route');
    const res = await POST(makeRequest({ pdfUrl: '/saws2plus.pdf' }));
    const body = await res.json();
    expect(res.status).toBe(429);
    expect(body.error).toContain('OpenAI is rate limiting this demo');
  });

  it('uses the OpenAI extract model with structured JSON output', async () => {
    const { POST } = await import('./route');
    await POST(makeRequest({ pdfUrl: '/saws2plus.pdf' }));
    const call = mockResponsesCreate.mock.calls[0][0];
    expect(call.model).toBe('gpt-4.1-mini');
    expect(call.text.format).toMatchObject({
      type: 'json_schema',
      name: 'form_schema',
    });
  });
});

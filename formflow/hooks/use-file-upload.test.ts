import { renderHook, act } from '@testing-library/react';
import { useFileUpload } from './use-file-upload';

describe('useFileUpload', () => {
  const makePdf = (sizeBytes: number) =>
    new File(['x'.repeat(sizeBytes)], 'test.pdf', { type: 'application/pdf' });

  const makeNonPdf = () =>
    new File(['hello'], 'test.txt', { type: 'text/plain' });

  it('accepts a valid PDF under size limit', () => {
    const { result } = renderHook(() => useFileUpload());
    act(() => result.current.validate(makePdf(1024)));
    expect(result.current.error).toBeNull();
    expect(result.current.file).not.toBeNull();
  });

  it('rejects a non-PDF file', () => {
    const { result } = renderHook(() => useFileUpload());
    act(() => result.current.validate(makeNonPdf()));
    expect(result.current.error).toMatch(/PDF/i);
    expect(result.current.file).toBeNull();
  });

  it('rejects a PDF over 20MB', () => {
    const { result } = renderHook(() => useFileUpload());
    const oversized = makePdf(21 * 1024 * 1024);
    act(() => result.current.validate(oversized));
    expect(result.current.error).toMatch(/20\s*MB/i);
    expect(result.current.file).toBeNull();
  });

  it('clears a previous error when a valid file is provided', () => {
    const { result } = renderHook(() => useFileUpload());
    act(() => result.current.validate(makeNonPdf()));
    expect(result.current.error).not.toBeNull();
    act(() => result.current.validate(makePdf(1024)));
    expect(result.current.error).toBeNull();
  });

  it('resets file and error', () => {
    const { result } = renderHook(() => useFileUpload());
    act(() => result.current.validate(makePdf(1024)));
    act(() => result.current.reset());
    expect(result.current.file).toBeNull();
    expect(result.current.error).toBeNull();
  });
});

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeroSection } from '@/components/landing/hero-section';
import { UploadZone } from '@/components/landing/upload-zone';
import { ProcessingSteps } from '@/components/landing/processing-steps';
import {
  getCachedExtraction,
  readPdfFile,
  saveCachedExtraction,
  type PdfReadResult,
} from '@/lib/extraction-cache';
import { useFormStore } from '@/store/form-store';
import { getDefaultDemoForm } from '@/lib/forms/registry';
import type { ChatMessage, UploadKind } from '@/types';

function makeMessage(role: ChatMessage['role'], content: string): ChatMessage {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    id,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function HomePage() {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [processingStep, setProcessingStep] = useState<number | null>(null);
  const {
    extractionError,
    resetSession,
    setActiveMode,
    setChatMessages,
    setExtractionStatus,
    setFormSchema,
    setPdfUrl,
    setSelectedDemoFormId,
    setUploadKind,
  } = useFormStore();
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  async function runExtraction(pdfUrl: string, pdfFile?: File, pdfRead?: PdfReadResult) {
    resetSession();
    setPdfUrl(pdfUrl);
    setSelectedDemoFormId(null);
    setExtractionStatus('processing');
    setProcessingStep(0);

    stepTimers.current.push(setTimeout(() => setProcessingStep(1), 800));
    stepTimers.current.push(setTimeout(() => setProcessingStep(2), 1600));

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfRead ? { pdfUrl, pdfBase64: pdfRead.base64 } : { pdfUrl }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Extract failed: ${res.status}`);
      const { schema } = body;
      const uploadKind = (body.uploadKind ?? 'unknown') as UploadKind;
      setFormSchema(schema);
      setUploadKind(uploadKind, typeof body.uploadKindConfidence === 'number' ? body.uploadKindConfidence : 0);
      setActiveMode(uploadKind === 'filled' ? 'check' : uploadKind === 'blank' ? 'walkthrough' : 'qa');
      if (pdfFile && pdfRead) {
        saveCachedExtraction({
          documentHash: pdfRead.documentHash,
          fileName: pdfFile.name,
          fileSize: pdfFile.size,
          lastModified: pdfFile.lastModified,
          cachedAt: new Date().toISOString(),
          schema,
          uploadKind,
          uploadKindConfidence:
            typeof body.uploadKindConfidence === 'number' ? body.uploadKindConfidence : 0,
        });
      }
      setExtractionStatus('complete');
      router.push('/form');
    } catch (err) {
      stepTimers.current.forEach(clearTimeout);
      setExtractionStatus('error', err instanceof Error ? err.message : 'Unknown error');
      setProcessingStep(null);
    }
  }

  function handleTryDemo() {
    const demo = getDefaultDemoForm();
    resetSession();
    setSelectedDemoFormId(demo.id);
    setFormSchema(demo.schema);
    setPdfUrl(demo.pdfUrl);
    setUploadKind('blank', 1);
    setActiveMode('walkthrough');
    setExtractionStatus('complete');
    setChatMessages([
      makeMessage(
        'assistant',
        `Loaded ${demo.title}. I can walk through the required fields, answer questions, or check existing answers.`
      ),
    ]);
    router.push('/form');
  }

  async function handleFile(file: File) {
    const blobUrl = URL.createObjectURL(file);
    const pdfRead = await readPdfFile(file);
    const cached = getCachedExtraction(pdfRead.documentHash);

    if (cached) {
      resetSession();
      setPdfUrl(blobUrl);
      setSelectedDemoFormId(null);
      setFormSchema(cached.schema);
      setUploadKind(cached.uploadKind, cached.uploadKindConfidence);
      setActiveMode(cached.uploadKind === 'filled' ? 'check' : cached.uploadKind === 'blank' ? 'walkthrough' : 'qa');
      setExtractionStatus('complete');
      setChatMessages([
        makeMessage(
          'assistant',
          `Loaded cached guidance for ${cached.fileName}. I can walk through the required fields, answer questions, or check existing answers.`
        ),
      ]);
      router.push('/form');
      return;
    }

    runExtraction(blobUrl, file, pdfRead);
  }

  const isProcessing = processingStep !== null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-background px-6 py-24">
      {isProcessing ? (
        <div className="flex flex-col items-center gap-8">
          <h2 className="text-xl font-semibold text-foreground">Processing your form…</h2>
          <ProcessingSteps currentStep={processingStep} />
        </div>
      ) : (
        <>
          <HeroSection
            onTryDemo={handleTryDemo}
            onUploadClick={() => setShowUpload(true)}
          />
          {extractionError && (
            <div
              role="alert"
              className="max-w-2xl rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {extractionError}
            </div>
          )}
          {showUpload && (
            <div className="w-full max-w-md">
              <UploadZone onFile={handleFile} />
            </div>
          )}
        </>
      )}
    </main>
  );
}

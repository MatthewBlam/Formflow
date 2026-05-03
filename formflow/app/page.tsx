'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HeroSection } from '@/components/landing/hero-section';
import { UploadZone } from '@/components/landing/upload-zone';
import { ProcessingSteps } from '@/components/landing/processing-steps';
import { useFormStore } from '@/store/form-store';
import { DEMO_PDF_URL } from '@/lib/constants';

export default function HomePage() {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [processingStep, setProcessingStep] = useState<number | null>(null);
  const { extractionError, setExtractionStatus, setFormSchema, setPdfUrl } = useFormStore();
  const stepTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  async function runExtraction(pdfUrl: string, pdfBase64?: string) {
    setPdfUrl(pdfUrl);
    setExtractionStatus('processing');
    setProcessingStep(0);

    stepTimers.current.push(setTimeout(() => setProcessingStep(1), 800));
    stepTimers.current.push(setTimeout(() => setProcessingStep(2), 1600));

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pdfBase64 ? { pdfUrl, pdfBase64 } : { pdfUrl }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `Extract failed: ${res.status}`);
      const { schema } = body;
      setFormSchema(schema);
      setExtractionStatus('complete');
      router.push('/form');
    } catch (err) {
      stepTimers.current.forEach(clearTimeout);
      setExtractionStatus('error', err instanceof Error ? err.message : 'Unknown error');
      setProcessingStep(null);
    }
  }

  function handleTryDemo() {
    runExtraction(DEMO_PDF_URL);
  }

  async function handleFile(file: File) {
    const blobUrl = URL.createObjectURL(file);
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    runExtraction(blobUrl, base64);
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

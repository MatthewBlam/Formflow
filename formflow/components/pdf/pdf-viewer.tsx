'use client';
import { useState, useCallback } from 'react';
import { Document, Page } from 'react-pdf';
import '@/lib/pdf-worker';

interface PdfViewerProps {
  url: string;
  currentPage: number;
  onLoadSuccess: (numPages: number) => void;
}

export function PdfViewer({ url, currentPage, onLoadSuccess }: PdfViewerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      onLoadSuccess(numPages);
    },
    [onLoadSuccess]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-destructive text-sm p-4">
        Failed to load PDF. {error}
      </div>
    );
  }

  return (
    <Document
      file={url}
      onLoadSuccess={handleLoadSuccess}
      onLoadError={(err) => setError(err.message)}
      loading={
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Loading PDF…
        </div>
      }
    >
      <Page
        pageNumber={currentPage}
        renderAnnotationLayer={false}
        renderTextLayer={false}
        width={undefined}
        className="w-full"
      />
    </Document>
  );
}

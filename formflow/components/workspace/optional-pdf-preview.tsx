'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PdfControls } from '@/components/pdf/pdf-controls';

const PdfViewer = dynamic(
  () => import('@/components/pdf/pdf-viewer').then((module) => module.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        Loading PDF...
      </div>
    ),
  }
);

interface OptionalPdfPreviewProps {
  pdfUrl: string | null;
  currentPage: number;
  onPageChange: (page: number) => void;
}

export function OptionalPdfPreview({ pdfUrl, currentPage, onPageChange }: OptionalPdfPreviewProps) {
  const [open, setOpen] = React.useState(false);
  const [totalPages, setTotalPages] = React.useState(1);

  if (!pdfUrl) return null;

  return (
    <section className="border-b">
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">PDF preview</p>
          <p className="text-sm text-foreground">Original form reference</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setOpen((value) => !value)} className="rounded-md">
          {open ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {open ? 'Hide' : 'Preview'}
        </Button>
      </div>
      {open && (
        <div className="border-t">
          <div className="flex justify-center border-b p-2">
            <PdfControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevPage={() => onPageChange(Math.max(1, currentPage - 1))}
              onNextPage={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            />
          </div>
          <div className="max-h-[420px] overflow-auto bg-muted/30 p-3">
            <div className="mx-auto w-fit">
              <PdfViewer url={pdfUrl} currentPage={currentPage} onLoadSuccess={setTotalPages} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

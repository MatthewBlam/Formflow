'use client';
import { useState, useCallback } from 'react';
import { useFormStore } from '@/store/form-store';
import { getFieldStatusMap, getCompletionPercentage } from '@/store/selectors';
import dynamic from 'next/dynamic';
import Link from 'next/link';
const PdfViewer = dynamic(
  () => import('@/components/pdf/pdf-viewer').then((m) => m.PdfViewer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Loading PDF…</div> }
);
import { PdfControls } from '@/components/pdf/pdf-controls';
import { PanelContainer } from '@/components/panel/panel-container';

export default function FormPage() {
  const pdfUrl = useFormStore((s) => s.pdfUrl);
  const formSchema = useFormStore((s) => s.formSchema);
  const currentPage = useFormStore((s) => s.currentPage);
  const setCurrentPage = useFormStore((s) => s.setCurrentPage);
  const activeFieldId = useFormStore((s) => s.activeFieldId);
  const setActiveFieldId = useFormStore((s) => s.setActiveFieldId);
  const updateProfileEntry = useFormStore((s) => s.updateProfileEntry);
  const documentStatusMap = useFormStore((s) => s.documentStatusMap);
  const setDocumentStatus = useFormStore((s) => s.setDocumentStatus);
  const state = useFormStore();
  const fieldStatusMap = getFieldStatusMap(state);
  const completionPercentage = getCompletionPercentage(state);

  const handleSaveAnswer = useCallback(
    (fieldId: string, value: string) => {
      updateProfileEntry(fieldId, { fieldId, value, status: 'complete', source: 'interview' });
    },
    [updateProfileEntry]
  );

  const [totalPages, setTotalPages] = useState(1);

  const handleFieldSelect = useCallback(
    (fieldId: string | null) => {
      setActiveFieldId(fieldId);
    },
    [setActiveFieldId]
  );

  if (!pdfUrl) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted-foreground">
        No form loaded.{' '}
        <Link href="/" className="underline ml-1">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[3fr_2fr] flex-1 overflow-hidden">
      {/* Left: plain PDF */}
      <div className="flex flex-col overflow-hidden border-r">
        <div className="flex items-center justify-center border-b px-4 py-2 bg-background">
          <PdfControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevPage={() => setCurrentPage(currentPage - 1)}
            onNextPage={() => setCurrentPage(currentPage + 1)}
          />
        </div>
        <div className="flex-1 overflow-auto flex justify-center">
          <div className="relative">
            <PdfViewer url={pdfUrl} currentPage={currentPage} onLoadSuccess={setTotalPages} />
          </div>
        </div>
      </div>

      {/* Right: side panel */}
      <div className="flex flex-col overflow-hidden border-l" id="side-panel">
        <PanelContainer
          schema={formSchema}
          currentPage={currentPage}
          totalPages={totalPages}
          activeFieldId={activeFieldId}
          fieldStatusMap={fieldStatusMap}
          documentStatusMap={documentStatusMap}
          completionPercentage={completionPercentage}
          onSaveAnswer={handleSaveAnswer}
          onSelectField={handleFieldSelect}
          onPageChange={setCurrentPage}
          onSetDocumentStatus={setDocumentStatus}
        />
      </div>
    </div>
  );
}

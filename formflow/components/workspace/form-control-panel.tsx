'use client';

import type { AnswerPacket } from '@/lib/assistant/answer-packet';
import type { FormSection, UploadKind } from '@/types';
import { AnswerPacketPreview } from './answer-packet-preview';
import { FormSourceSelector } from './form-source-selector';
import { OptionalPdfPreview } from './optional-pdf-preview';
import { StatusTracker } from './status-tracker';

interface FormControlPanelProps {
  selectedDemoFormId: string | null;
  uploadKind: UploadKind;
  uploadKindConfidence: number;
  processing: boolean;
  pdfUrl: string | null;
  currentPage: number;
  completionPercentage: number;
  currentSection: FormSection | null;
  remainingRequiredCount: number;
  missingDocumentCount: number;
  issueCount: number;
  answerPacket: AnswerPacket;
  onSelectDemo: (id: string) => void;
  onUpload: (file: File) => void;
  onPageChange: (page: number) => void;
}

function uploadKindLabel(kind: UploadKind, confidence: number) {
  if (kind === 'unknown') return 'Status unknown';
  return `${kind === 'filled' ? 'Filled' : 'Blank'} PDF ${Math.round(confidence * 100)}%`;
}

export function FormControlPanel({
  selectedDemoFormId,
  uploadKind,
  uploadKindConfidence,
  processing,
  pdfUrl,
  currentPage,
  completionPercentage,
  currentSection,
  remainingRequiredCount,
  missingDocumentCount,
  issueCount,
  answerPacket,
  onSelectDemo,
  onUpload,
  onPageChange,
}: FormControlPanelProps) {
  return (
    <aside className="flex min-h-0 flex-1 flex-col bg-background">
      <FormSourceSelector
        selectedDemoFormId={selectedDemoFormId}
        uploadKindLabel={uploadKindLabel(uploadKind, uploadKindConfidence)}
        processing={processing}
        onSelectDemo={onSelectDemo}
        onUpload={onUpload}
      />
      <StatusTracker
        completionPercentage={completionPercentage}
        currentSection={currentSection}
        remainingRequiredCount={remainingRequiredCount}
        missingDocumentCount={missingDocumentCount}
        issueCount={issueCount}
      />
      <OptionalPdfPreview pdfUrl={pdfUrl} currentPage={currentPage} onPageChange={onPageChange} />
      <AnswerPacketPreview packet={answerPacket} />
    </aside>
  );
}

'use client';

import type { AnswerPacket } from '@/lib/assistant/answer-packet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { FormField, FormSchema, FormSection, ProfileEntry, UploadKind } from '@/types';
import { AnswerPacketPreview } from './answer-packet-preview';
import { FormSourceSelector } from './form-source-selector';
import { OptionalPdfPreview } from './optional-pdf-preview';
import { ResponseEditor } from './response-editor';
import { StatusTracker } from './status-tracker';

interface FormControlPanelProps {
  schema: FormSchema | null;
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
  applicationProfile: Record<string, ProfileEntry>;
  onSelectDemo: (id: string) => void;
  onUpload: (file: File) => void;
  onPageChange: (page: number) => void;
  onSaveManualAnswer: (field: FormField, value: string) => void;
}

function uploadKindLabel(kind: UploadKind, confidence: number) {
  if (kind === 'unknown') return 'Status unknown';
  return `${kind === 'filled' ? 'Filled' : 'Blank'} PDF ${Math.round(confidence * 100)}%`;
}

const panelTabClassName =
  'rounded-md px-2 text-xs data-active:bg-primary data-active:text-primary-foreground sm:text-sm';

export function FormControlPanel({
  schema,
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
  applicationProfile,
  onSelectDemo,
  onUpload,
  onPageChange,
  onSaveManualAnswer,
}: FormControlPanelProps) {
  return (
    <aside className="flex min-h-0 flex-1 flex-col bg-background">
      <Tabs defaultValue="status" className="flex min-h-0 flex-1 flex-col gap-0">
        <div className="border-b p-3">
          <TabsList className="grid h-auto w-full grid-cols-5 rounded-md">
            <TabsTrigger value="source" className={panelTabClassName}>
              Source
            </TabsTrigger>
            <TabsTrigger value="status" className={panelTabClassName}>
              Status
            </TabsTrigger>
            <TabsTrigger value="packet" className={panelTabClassName}>
              Packet
            </TabsTrigger>
            <TabsTrigger value="responses" className={panelTabClassName}>
              Edit
            </TabsTrigger>
            <TabsTrigger value="pdf" className={panelTabClassName}>
              PDF
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="source" className="min-h-0 overflow-auto">
          <FormSourceSelector
            selectedDemoFormId={selectedDemoFormId}
            uploadKindLabel={uploadKindLabel(uploadKind, uploadKindConfidence)}
            processing={processing}
            onSelectDemo={onSelectDemo}
            onUpload={onUpload}
          />
        </TabsContent>

        <TabsContent value="status" className="min-h-0 overflow-auto">
          <StatusTracker
            completionPercentage={completionPercentage}
            currentSection={currentSection}
            remainingRequiredCount={remainingRequiredCount}
            missingDocumentCount={missingDocumentCount}
            issueCount={issueCount}
          />
        </TabsContent>

        <TabsContent value="packet" className="min-h-0 overflow-auto">
          <AnswerPacketPreview packet={answerPacket} />
        </TabsContent>

        <TabsContent value="responses" className="min-h-0 overflow-auto">
          <ResponseEditor
            schema={schema}
            applicationProfile={applicationProfile}
            onSaveAnswer={onSaveManualAnswer}
          />
        </TabsContent>

        <TabsContent value="pdf" className="min-h-0 overflow-auto">
          <OptionalPdfPreview
            pdfUrl={pdfUrl}
            currentPage={currentPage}
            onPageChange={onPageChange}
            alwaysOpen
          />
        </TabsContent>
      </Tabs>
    </aside>
  );
}

'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompletionChecklist } from './completion-checklist';
import { DocumentChecklist } from './document-checklist';
import { PageWalkthrough } from './page-walkthrough';
import { FormProgressBar } from './progress-bar';
import type { FormSchema, FieldStatus } from '@/types';

interface PanelContainerProps {
  schema: FormSchema | null;
  currentPage: number;
  totalPages: number;
  activeFieldId: string | null;
  fieldStatusMap: Record<string, FieldStatus>;
  documentStatusMap: Record<string, 'needed' | 'present'>;
  completionPercentage: number;
  onSaveAnswer: (fieldId: string, value: string) => void;
  onSelectField: (fieldId: string | null) => void;
  onPageChange: (page: number) => void;
  onSetDocumentStatus: (docId: string, status: 'needed' | 'present') => void;
}

export function PanelContainer({
  schema,
  currentPage,
  totalPages,
  activeFieldId,
  fieldStatusMap,
  documentStatusMap,
  completionPercentage,
  onSaveAnswer,
  onSelectField,
  onPageChange,
  onSetDocumentStatus,
}: PanelContainerProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <FormProgressBar percentage={completionPercentage} />
      <Tabs
        defaultValue="guide"
        className="flex flex-col flex-1 overflow-hidden"
      >
        <TabsList className="mx-4 mt-3 w-auto self-start shrink-0">
          <TabsTrigger value="guide">Guide</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="guide" className="flex-1 overflow-auto mt-0">
          <PageWalkthrough
            schema={schema}
            currentPage={currentPage}
            totalPages={totalPages}
            activeFieldId={activeFieldId}
            fieldStatusMap={fieldStatusMap}
            onSelectField={onSelectField}
            onSaveAnswer={onSaveAnswer}
            onPageChange={onPageChange}
          />
        </TabsContent>

        <TabsContent value="checklist" className="flex-1 overflow-auto mt-0">
          {schema ? (
            <CompletionChecklist
              schema={schema}
              fieldStatusMap={fieldStatusMap}
              onSelectField={onSelectField}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4 text-center">
              No form loaded.
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="flex-1 overflow-auto mt-0">
          <DocumentChecklist
            docs={schema?.documentRequirements ?? []}
            documentStatusMap={documentStatusMap}
            onSetDocumentStatus={onSetDocumentStatus}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

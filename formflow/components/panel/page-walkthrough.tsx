'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { FieldStatus, FormField, FormSchema } from '@/types';

interface PageWalkthroughProps {
  schema: FormSchema | null;
  currentPage: number;
  totalPages: number;
  activeFieldId: string | null;
  fieldStatusMap: Record<string, FieldStatus>;
  onSelectField: (fieldId: string | null) => void;
  onSaveAnswer: (fieldId: string, value: string) => void;
  onPageChange: (page: number) => void;
}

interface PageField {
  field: FormField;
  sectionTitle: string;
}

const STATUS_LABEL: Record<FieldStatus, string> = {
  complete: 'Done',
  missing: 'Needed',
  needs_confirmation: 'Review',
  inferred: 'Filled',
  conflicting: 'Check',
};

function isComplete(status: FieldStatus | undefined) {
  return status === 'complete' || status === 'inferred';
}

export function PageWalkthrough({
  schema,
  currentPage,
  totalPages,
  activeFieldId,
  fieldStatusMap,
  onSelectField,
  onSaveAnswer,
  onPageChange,
}: PageWalkthroughProps) {
  const [draftAnswer, setDraftAnswer] = useState<{ fieldId: string | null; value: string }>({
    fieldId: null,
    value: '',
  });

  const pageFields = useMemo<PageField[]>(() => {
    if (!schema) return [];
    return schema.sections.flatMap((section) =>
      section.fields
        .filter((field) => field.page === currentPage)
        .map((field) => ({ field, sectionTitle: section.title }))
    );
  }, [schema, currentPage]);

  const currentField =
    pageFields.find(({ field }) => field.id === activeFieldId)?.field ??
    pageFields.find(({ field }) => !isComplete(fieldStatusMap[field.id]))?.field ??
    pageFields[0]?.field ??
    null;

  useEffect(() => {
    if (currentField && currentField.id !== activeFieldId) {
      onSelectField(currentField.id);
    }
  }, [activeFieldId, currentField, onSelectField]);

  const value = currentField && draftAnswer.fieldId === currentField.id ? draftAnswer.value : '';

  function submitAnswer() {
    if (!currentField || !value.trim()) return;
    onSaveAnswer(currentField.id, value.trim());
    setDraftAnswer({ fieldId: currentField.id, value: '' });

    const currentIndex = pageFields.findIndex(({ field }) => field.id === currentField.id);
    const nextField = pageFields
      .slice(currentIndex + 1)
      .find(({ field }) => !isComplete(fieldStatusMap[field.id]))?.field;

    if (nextField) {
      onSelectField(nextField.id);
    }
  }

  if (!schema) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted-foreground">
        No form loaded.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Page</p>
            <h2 className="text-lg font-semibold text-foreground">
              {currentPage} of {totalPages}
            </h2>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {pageFields.length === 0 ? (
        <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted-foreground">
          No questions found on this page.
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b p-4">
            {currentField && (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {pageFields.find(({ field }) => field.id === currentField.id)?.sectionTitle}
                  </p>
                  <h3 className="text-base font-semibold text-foreground">
                    {currentField.plainLanguageLabel ?? currentField.label}
                  </h3>
                </div>
                {currentField.whyAsking && (
                  <p className="text-sm leading-6 text-muted-foreground">{currentField.whyAsking}</p>
                )}
                {currentField.exampleAnswer && (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Example: {currentField.exampleAnswer}
                  </p>
                )}
                <Textarea
                  value={value}
                  onChange={(event) =>
                    setDraftAnswer({ fieldId: currentField.id, value: event.target.value })
                  }
                  placeholder="Type your answer..."
                  rows={3}
                  aria-label={currentField.label}
                />
                <Button type="button" size="sm" onClick={submitAnswer} disabled={!value.trim()}>
                  Save and continue
                </Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Questions on this page</p>
            <div className="flex flex-col gap-2">
              {pageFields.map(({ field }) => {
                const status = fieldStatusMap[field.id] ?? 'missing';
                const selected = currentField?.id === field.id;
                return (
                  <button
                    key={field.id}
                    type="button"
                    aria-label={`${field.label}: ${STATUS_LABEL[status]}`}
                    onClick={() => onSelectField(field.id)}
                    className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                      selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
                    }`}
                  >
                    <span className="block font-medium text-foreground">{field.label}</span>
                    <span className="text-xs text-muted-foreground">{STATUS_LABEL[status]}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

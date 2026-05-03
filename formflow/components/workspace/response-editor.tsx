'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { FormField, FormSchema, ProfileEntry } from '@/types';

interface ResponseEditorProps {
  schema: FormSchema | null;
  applicationProfile: Record<string, ProfileEntry>;
  onSaveAnswer: (field: FormField, value: string) => void;
}

function allEditableFields(schema: FormSchema | null) {
  if (!schema) return [];
  return schema.sections.flatMap((section) =>
    section.fields.map((field) => ({ field, sectionTitle: section.title }))
  );
}

export function ResponseEditor({ schema, applicationProfile, onSaveAnswer }: ResponseEditorProps) {
  const fields = useMemo(() => allEditableFields(schema), [schema]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const effectiveSelectedFieldId = selectedFieldId ?? fields[0]?.field.id ?? null;
  const selectedField =
    fields.find(({ field }) => field.id === effectiveSelectedFieldId) ?? fields[0] ?? null;
  const currentValue = selectedField ? applicationProfile[selectedField.field.id]?.value ?? '' : '';
  const [draft, setDraft] = useState<{ fieldId: string | null; value: string }>({
    fieldId: null,
    value: '',
  });
  const displayedValue = draft.fieldId === selectedField?.field.id ? draft.value : currentValue;

  if (!schema) {
    return (
      <section className="flex h-full items-center justify-center bg-secondary/20 p-4 text-center text-sm text-muted-foreground">
        Load a form to edit responses.
      </section>
    );
  }

  return (
    <section className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] bg-secondary/20">
      <div className="min-h-0 overflow-auto p-4">
        <div className="mb-4 rounded-xl bg-card p-4 ring-1 ring-border/40">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Manual responses</p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Edit saved answers</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Changes here update the same answers the caseworker chat uses.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="flex max-h-[44vh] flex-col gap-2 overflow-auto rounded-xl bg-card p-3 ring-1 ring-border/40">
            {fields.map(({ field, sectionTitle }) => {
              const selected = selectedField?.field.id === field.id;
              const value = applicationProfile[field.id]?.value;
              return (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => {
                    setSelectedFieldId(field.id);
                    setDraft({ fieldId: null, value: '' });
                  }}
                  className={`rounded-lg px-3 py-2 text-left transition-colors ${
                    selected ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                  }`}
                >
                  <span className="block text-xs font-medium uppercase tracking-wide opacity-75">
                    Page {field.page} - {sectionTitle}
                  </span>
                  <span className="mt-1 block text-sm font-semibold">
                    {field.plainLanguageLabel ?? field.label}
                  </span>
                  <span className={`mt-1 block truncate text-xs ${selected ? 'opacity-80' : 'text-muted-foreground'}`}>
                    {value?.trim() ? value : 'No answer saved'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="rounded-xl bg-card p-4 ring-1 ring-border/40">
            {selectedField && (
              <div className="flex h-full min-h-[320px] flex-col gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Page {selectedField.field.page} - {selectedField.sectionTitle}
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-foreground">
                    {selectedField.field.plainLanguageLabel ?? selectedField.field.label}
                  </h3>
                </div>
                {selectedField.field.whyAsking && (
                  <p className="text-sm leading-6 text-muted-foreground">{selectedField.field.whyAsking}</p>
                )}
                {selectedField.field.options?.length ? (
                  <p className="text-sm leading-6 text-muted-foreground">
                    Options: {selectedField.field.options.join(', ')}
                  </p>
                ) : null}
                <Textarea
                  value={displayedValue}
                  onChange={(event) =>
                    setDraft({ fieldId: selectedField.field.id, value: event.target.value })
                  }
                  placeholder={selectedField.field.exampleAnswer ?? 'Type the saved answer...'}
                  rows={5}
                  aria-label={`Edit ${selectedField.field.label}`}
                />
                <div className="mt-auto flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {currentValue.trim() ? 'Saved answer exists' : 'No saved answer yet'}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onSaveAnswer(selectedField.field, displayedValue.trim())}
                    disabled={!displayedValue.trim() || displayedValue.trim() === currentValue}
                  >
                    Save response
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

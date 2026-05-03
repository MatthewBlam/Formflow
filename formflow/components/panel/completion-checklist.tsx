'use client';

import type { FormSchema, FieldStatus } from '@/types';

const STATUS_ICON: Record<FieldStatus, string> = {
  complete: '✓',
  missing: '○',
  needs_confirmation: '?',
  inferred: '~',
  conflicting: '!',
};

const STATUS_COLOR: Record<FieldStatus, string> = {
  complete: 'text-green-600',
  missing: 'text-muted-foreground',
  needs_confirmation: 'text-orange-500',
  inferred: 'text-blue-500',
  conflicting: 'text-red-500',
};

interface CompletionChecklistProps {
  schema: FormSchema;
  fieldStatusMap: Record<string, FieldStatus>;
  onSelectField: (fieldId: string) => void;
}

export function CompletionChecklist({ schema, fieldStatusMap, onSelectField }: CompletionChecklistProps) {
  return (
    <div className="flex flex-col gap-4 p-4 overflow-auto">
      {schema.sections.map((section) => {
        const requiredFields = section.fields.filter((f) => f.required);
        if (requiredFields.length === 0) return null;
        return (
          <div key={section.id}>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {section.title}
            </p>
            <ul className="flex flex-col gap-1">
              {requiredFields.map((field) => {
                const status = fieldStatusMap[field.id] ?? 'missing';
                return (
                  <li key={field.id}>
                    <button
                      type="button"
                      data-status={status}
                      onClick={() => onSelectField(field.id)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-sm text-left hover:bg-accent transition-colors"
                    >
                      <span className={`text-xs font-bold ${STATUS_COLOR[status]}`}>
                        {STATUS_ICON[status]}
                      </span>
                      <span className="text-foreground">{field.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

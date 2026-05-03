import type { FormField, FormFlowState, FormSchema, ProfileEntry } from '@/types';

export function getAllFields(schema: FormSchema | null) {
  return schema?.sections.flatMap((section) => section.fields) ?? [];
}

export function getFieldById(schema: FormSchema | null, fieldId: string | null | undefined) {
  if (!schema || !fieldId) return null;
  return getAllFields(schema).find((field) => field.id === fieldId) ?? null;
}

export function getSectionForField(schema: FormSchema | null, fieldId: string | null | undefined) {
  if (!schema || !fieldId) return null;
  return schema.sections.find((section) => section.fields.some((field) => field.id === fieldId)) ?? null;
}

export function isFieldComplete(field: FormField, profile: Record<string, ProfileEntry>) {
  const entry = profile[field.id];
  return Boolean(entry?.value.trim()) && (entry.status === 'complete' || entry.status === 'inferred');
}

export function getFirstIncompleteRequiredField(state: Pick<FormFlowState, 'formSchema' | 'applicationProfile'>) {
  return getAllFields(state.formSchema).find(
    (field) => field.required && !isFieldComplete(field, state.applicationProfile)
  ) ?? null;
}

export function getNextIncompleteRequiredField(
  state: Pick<FormFlowState, 'formSchema' | 'applicationProfile'>,
  currentFieldId: string | null
) {
  const fields = getAllFields(state.formSchema).filter((field) => field.required);
  const currentIndex = Math.max(
    0,
    fields.findIndex((field) => field.id === currentFieldId)
  );
  return (
    fields.slice(currentIndex + 1).find((field) => !isFieldComplete(field, state.applicationProfile)) ??
    fields.find((field) => !isFieldComplete(field, state.applicationProfile)) ??
    null
  );
}

export function formatFieldPrompt(field: FormField) {
  const parts = [
    field.plainLanguageLabel ?? field.label,
    field.whyAsking ? `Why this matters: ${field.whyAsking}` : null,
    field.exampleAnswer ? `Example: ${field.exampleAnswer}` : null,
  ].filter(Boolean);

  return `${parts.join('\n\n')}\n\nWhat should I put for this?`;
}

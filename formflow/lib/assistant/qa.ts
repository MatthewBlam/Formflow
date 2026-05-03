import type { FormFlowState } from '@/types';
import { getAllFields, getSectionForField } from './modes';

const DOCUMENT_TERMS = ['document', 'proof', 'paper', 'pay stub', 'id', 'address'];
const BLANK_TERMS = ['blank', 'skip', 'leave empty', 'required', 'optional'];

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function answerQuestion(
  state: Pick<FormFlowState, 'formSchema' | 'applicationProfile' | 'documentStatusMap'>,
  question: string
) {
  const schema = state.formSchema;
  if (!schema) {
    return 'Load a form first, then I can answer questions about fields, documents, and what is still missing.';
  }

  const normalized = question.toLowerCase();
  const fields = getAllFields(schema);
  const matchingField = fields.find((field) => {
    const haystack = `${field.id} ${field.label} ${field.plainLanguageLabel ?? ''}`.toLowerCase();
    return normalized
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .some((word) => haystack.includes(word));
  });

  if (includesAny(normalized, DOCUMENT_TERMS)) {
    const docs = schema.documentRequirements ?? [];
    const needed = docs.filter((doc) => state.documentStatusMap[doc.id] !== 'present');
    if (needed.length === 0) {
      return 'All listed documents are marked present. You should still bring the originals or copies that the county asks for.';
    }
    return `You still have ${needed.length} document item${needed.length === 1 ? '' : 's'} marked needed: ${needed
      .map((doc) => doc.title)
      .join(', ')}.`;
  }

  if (matchingField) {
    const section = getSectionForField(schema, matchingField.id);
    const entry = state.applicationProfile[matchingField.id];
    if (includesAny(normalized, BLANK_TERMS)) {
      return `${matchingField.plainLanguageLabel ?? matchingField.label} is ${matchingField.required ? 'required for this guided packet' : 'optional or situation-dependent'}. ${matchingField.required ? 'If you do not know it, mark it for review instead of guessing.' : 'You can leave it blank if it does not apply.'}`;
    }
    return `${matchingField.plainLanguageLabel ?? matchingField.label}: ${matchingField.whyAsking ?? 'This helps the county review your application.'} Related section: ${section?.title ?? 'Unknown section'}.${entry?.value ? ` Current answer: ${entry.value}.` : ' No answer is saved yet.'}`;
  }

  if (normalized.includes('progress') || normalized.includes('missing')) {
    const missing = fields.filter((field) => field.required && !state.applicationProfile[field.id]?.value.trim());
    if (missing.length === 0) {
      return 'No required guided fields are missing. Use the Check button to review documents and consistency issues.';
    }
    return `You still need ${missing.length} required answer${missing.length === 1 ? '' : 's'}. Next missing field: ${missing[0].plainLanguageLabel ?? missing[0].label}.`;
  }

  return 'I can answer questions about a specific field, section, document proof, whether something can be left blank, or what is still missing.';
}

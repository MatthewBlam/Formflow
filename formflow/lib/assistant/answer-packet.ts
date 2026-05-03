import type { FormFlowState, Issue } from '@/types';

export interface AnswerPacketSection {
  id: string;
  title: string;
  answers: Array<{ fieldId: string; label: string; value: string }>;
  missing: Array<{ fieldId: string; label: string }>;
}

export interface AnswerPacket {
  title: string;
  sections: AnswerPacketSection[];
  documents: {
    present: string[];
    needed: string[];
  };
  issues: Issue[];
}

export function buildAnswerPacket(
  state: Pick<FormFlowState, 'formSchema' | 'applicationProfile' | 'documentStatusMap' | 'checkIssues'>
): AnswerPacket {
  const schema = state.formSchema;
  const docs = schema?.documentRequirements ?? [];

  return {
    title: schema?.title ?? 'No form loaded',
    sections:
      schema?.sections.map((section) => ({
        id: section.id,
        title: section.title,
        answers: section.fields
          .map((field) => ({
            field,
            entry: state.applicationProfile[field.id],
          }))
          .filter(({ entry }) => Boolean(entry?.value.trim()))
          .map(({ field, entry }) => ({
            fieldId: field.id,
            label: field.plainLanguageLabel ?? field.label,
            value: entry!.value,
          })),
        missing: section.fields
          .filter((field) => field.required && !state.applicationProfile[field.id]?.value.trim())
          .map((field) => ({
            fieldId: field.id,
            label: field.plainLanguageLabel ?? field.label,
          })),
      })) ?? [],
    documents: {
      present: docs
        .filter((doc) => state.documentStatusMap[doc.id] === 'present')
        .map((doc) => doc.title),
      needed: docs
        .filter((doc) => state.documentStatusMap[doc.id] !== 'present')
        .map((doc) => doc.title),
    },
    issues: state.checkIssues,
  };
}

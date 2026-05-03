import type { FormFlowState, FieldStatus, Issue } from '@/types';

type FieldStatusMap = Record<string, FieldStatus>;
type SuggestedNextStep = 'review_issues' | 'add_documents' | 'continue_interview' | 'ready';

export function getFieldStatusMap(state: FormFlowState): FieldStatusMap {
  if (!state.formSchema) return {};
  const result: FieldStatusMap = {};
  for (const section of state.formSchema.sections) {
    for (const field of section.fields) {
      const entry = state.applicationProfile[field.id];
      result[field.id] = entry ? entry.status : 'missing';
    }
  }
  return result;
}

export function getIssues(state: FormFlowState): Issue[] {
  void state;
  return [];
}

export function getCompletionPercentage(state: FormFlowState): number {
  if (!state.formSchema) return 0;
  const requiredFields = state.formSchema.sections
    .flatMap((s) => s.fields)
    .filter((f) => f.required);
  if (requiredFields.length === 0) return 100;
  const completeCount = requiredFields.filter((f) => {
    const entry = state.applicationProfile[f.id];
    return entry && (entry.status === 'complete' || entry.status === 'inferred');
  }).length;
  return Math.round((completeCount / requiredFields.length) * 100);
}

export function getSuggestedNextStep(state: FormFlowState): SuggestedNextStep {
  if (getIssues(state).length > 0) return 'review_issues';

  const hasNeededDocs = Object.values(state.documentStatusMap).some((s) => s === 'needed');
  if (hasNeededDocs) return 'add_documents';

  if (!state.formSchema) return 'ready';

  const hasMissingRequired = state.formSchema.sections
    .flatMap((s) => s.fields)
    .filter((f) => f.required)
    .some((f) => {
      const entry = state.applicationProfile[f.id];
      return !entry || (entry.status !== 'complete' && entry.status !== 'inferred');
    });

  return hasMissingRequired ? 'continue_interview' : 'ready';
}

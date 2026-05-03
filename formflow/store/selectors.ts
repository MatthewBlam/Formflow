import type { FormFlowState, FieldStatus, Issue } from '@/types';
import { buildAnswerPacket } from '@/lib/assistant/answer-packet';
import { runChecks } from '@/lib/assistant/check';
import { getAllFields, getSectionForField } from '@/lib/assistant/modes';

type FieldStatusMap = Record<string, FieldStatus>;
type SuggestedNextStep = 'review_issues' | 'add_documents' | 'continue_interview' | 'ready';

export function getFieldStatusMap(state: FormFlowState): FieldStatusMap {
  if (!state.formSchema) return {};
  const result: FieldStatusMap = {};
  const conflictingFieldIds = new Set(
    getIssues(state)
      .filter((issue) => issue.type === 'contradiction')
      .flatMap((issue) => issue.fieldIds)
  );
  for (const section of state.formSchema.sections) {
    for (const field of section.fields) {
      const entry = state.applicationProfile[field.id];
      result[field.id] = conflictingFieldIds.has(field.id) ? 'conflicting' : entry ? entry.status : 'missing';
    }
  }
  return result;
}

export function getIssues(state: FormFlowState): Issue[] {
  return state.checkIssues.length > 0 ? state.checkIssues : runChecks(state);
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

export function getCurrentSection(state: FormFlowState) {
  return getSectionForField(state.formSchema, state.currentFieldId ?? state.activeFieldId);
}

export function getRemainingRequiredFields(state: FormFlowState) {
  return getAllFields(state.formSchema).filter((field) => {
    if (!field.required) return false;
    const entry = state.applicationProfile[field.id];
    return !entry || !entry.value.trim() || entry.status === 'missing';
  });
}

export function getCheckIssueCount(state: FormFlowState) {
  return getIssues(state).length;
}

export function getAnswerPacket(state: FormFlowState) {
  return buildAnswerPacket({ ...state, checkIssues: getIssues(state) });
}

export function getSuggestedNextStep(state: FormFlowState): SuggestedNextStep {
  if (getIssues(state).some((issue) => issue.type !== 'missing_required')) return 'review_issues';

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

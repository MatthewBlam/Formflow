import type { FormFlowState, FormSchema, Issue, ProfileEntry } from '@/types';
import { getDemoForm } from '@/lib/forms/registry';
import { saws2PlusForm } from '@/lib/forms/saws2plus';

function missingRequiredIssues(schema: FormSchema, profile: Record<string, ProfileEntry>) {
  return schema.sections.flatMap((section) =>
    section.fields
      .filter((field) => field.required)
      .filter((field) => !profile[field.id]?.value.trim())
      .map((field) => ({
        id: `missing_${field.id}`,
        type: 'missing_required',
        fieldIds: [field.id],
        message: `${field.plainLanguageLabel ?? field.label} is still missing.`,
        suggestion: `Answer this field in ${section.title}.`,
        severity: 'warning' as const,
      }))
  );
}

export function runChecks(
  state: Pick<FormFlowState, 'formSchema' | 'applicationProfile' | 'documentStatusMap' | 'selectedDemoFormId'>
): Issue[] {
  if (!state.formSchema) return [];

  const demoForm = getDemoForm(state.selectedDemoFormId) ?? (state.formSchema.id === saws2PlusForm.schema.id ? saws2PlusForm : null);
  if (!demoForm) {
    return missingRequiredIssues(state.formSchema, state.applicationProfile);
  }

  const issues = demoForm.checkRules.flatMap((rule) =>
    rule.run({
      schema: state.formSchema!,
      profile: state.applicationProfile,
      documentStatusMap: state.documentStatusMap,
    })
  );

  return issues.filter(
    (issue, index, all) => index === all.findIndex((candidate) => candidate.id === issue.id)
  );
}

export function getCheckSummary(issues: Issue[]) {
  if (issues.length === 0) {
    return 'I do not see any required fields, document reminders, or consistency issues left. You should still review the original form before submitting.';
  }

  const first = issues[0];
  const rest = issues.length - 1;
  return `${issues.length} item${issues.length === 1 ? '' : 's'} need review. First: ${first.message}${rest > 0 ? ` There ${rest === 1 ? 'is' : 'are'} ${rest} more.` : ''}`;
}

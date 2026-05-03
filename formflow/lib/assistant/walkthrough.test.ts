import { describe, expect, it } from 'vitest';
import { handleWalkthroughAnswer } from './walkthrough';
import { saws2PlusForm } from '@/lib/forms/saws2plus';
import type { ProfileEntry } from '@/types';

function entry(fieldId: string, value: string): ProfileEntry {
  return {
    fieldId,
    value,
    status: 'complete',
    source: 'interview',
    confidence: 1,
  };
}

describe('handleWalkthroughAnswer', () => {
  it('saves the current answer and advances to the next missing required field', () => {
    const result = handleWalkthroughAnswer(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'programs_requested',
        activeMode: 'walkthrough',
      },
      'CalFresh'
    );

    expect(result.updates?.[0]).toMatchObject({
      fieldId: 'programs_requested',
      value: 'CalFresh',
      status: 'complete',
    });
    expect(result.nextFieldId).toBe('applicant_name');
  });

  it('moves to check mode after the last required field', () => {
    const profile: Record<string, ProfileEntry> = {};
    for (const field of saws2PlusForm.schema.sections.flatMap((section) => section.fields)) {
      if (field.required && field.id !== 'signature_date') {
        profile[field.id] = entry(field.id, 'answer');
      }
    }

    const result = handleWalkthroughAnswer(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: profile,
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'signature_date',
        activeMode: 'walkthrough',
      },
      '05/02/2026'
    );

    expect(result.mode).toBe('check');
    expect(result.nextFieldId).toBeNull();
    expect(result.issues?.length).toBeGreaterThan(0);
  });
});

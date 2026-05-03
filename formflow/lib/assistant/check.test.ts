import { describe, expect, it } from 'vitest';
import { runChecks } from './check';
import { saws2PlusForm } from '@/lib/forms/saws2plus';
import type { FormFlowState, ProfileEntry } from '@/types';

function entry(fieldId: string, value: string): ProfileEntry {
  return {
    fieldId,
    value,
    status: 'complete',
    source: 'interview',
    confidence: 1,
  };
}

function state(overrides: Partial<FormFlowState> = {}) {
  return {
    formSchema: saws2PlusForm.schema,
    applicationProfile: {},
    documentStatusMap: {},
    selectedDemoFormId: saws2PlusForm.id,
    ...overrides,
  };
}

describe('runChecks', () => {
  it('flags employment and income contradictions', () => {
    const issues = runChecks(
      state({
        applicationProfile: {
          employment_status: entry('employment_status', 'Unemployed'),
          monthly_income: entry('monthly_income', '$1200'),
        },
      })
    );

    expect(issues.some((issue) => issue.id === 'income_unemployed_conflict')).toBe(true);
  });

  it('flags missing evidence when address and income are present', () => {
    const issues = runChecks(
      state({
        applicationProfile: {
          home_address: entry('home_address', '123 Main St'),
          monthly_income: entry('monthly_income', '$1200'),
        },
      })
    );

    expect(issues.some((issue) => issue.id === 'address_needs_proof')).toBe(true);
    expect(issues.some((issue) => issue.id === 'income_needs_proof')).toBe(true);
  });
});

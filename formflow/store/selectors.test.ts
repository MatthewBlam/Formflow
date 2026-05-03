import { describe, test, expect } from 'vitest';
import {
  getFieldStatusMap,
  getIssues,
  getCompletionPercentage,
  getSuggestedNextStep,
} from '@/store/selectors';
import type { FormFlowState, FormSchema, ProfileEntry } from '@/types';

function makeField(id: string, required = true, page = 1) {
  return {
    id,
    label: id,
    type: 'text' as const,
    required,
    page,
    bbox: { x: 0.1, y: 0.1, width: 0.2, height: 0.05, page },
  };
}

function makeSchema(fieldIds: string[], requiredIds?: string[]): FormSchema {
  return {
    id: 'test-schema',
    title: 'Test Form',
    sections: [
      {
        id: 'section-1',
        title: 'Section 1',
        fields: fieldIds.map((id) =>
          makeField(id, requiredIds ? requiredIds.includes(id) : true)
        ),
      },
    ],
  };
}

function makeProfileEntry(fieldId: string, status: ProfileEntry['status'] = 'complete'): ProfileEntry {
  return {
    fieldId,
    value: 'test value',
    status,
    source: 'interview',
    confidence: 1,
  };
}

function makeState(overrides: Partial<FormFlowState> = {}): FormFlowState {
  return {
    formSchema: null,
    applicationProfile: {},
    documentStatusMap: {},
    language: 'en',
    currentPage: 1,
    activePanelView: null,
    activeFieldId: null,
    activeMode: 'walkthrough',
    selectedDemoFormId: null,
    uploadKind: 'unknown',
    uploadKindConfidence: 0,
    chatMessages: [],
    currentFieldId: null,
    checkIssues: [],
    setLanguage: () => {},
    setActiveFieldId: () => {},
    setCurrentFieldId: () => {},
    setCurrentPage: () => {},
    setActivePanelView: () => {},
    setActiveMode: () => {},
    setSelectedDemoFormId: () => {},
    setUploadKind: () => {},
    addChatMessage: () => {},
    setChatMessages: () => {},
    setCheckIssues: () => {},
    updateProfileEntry: () => {},
    setDocumentStatus: () => {},
    setFormSchema: () => {},
    resetSession: () => {},
    ...overrides,
  };
}

describe('getCompletionPercentage', () => {
  test('returns 0 when profile is empty', () => {
    const state = makeState({ formSchema: makeSchema(['name', 'dob', 'ssn']) });
    expect(getCompletionPercentage(state)).toBe(0);
  });

  test('returns 100 when all required fields are complete', () => {
    const state = makeState({
      formSchema: makeSchema(['name', 'dob']),
      applicationProfile: {
        name: makeProfileEntry('name', 'complete'),
        dob: makeProfileEntry('dob', 'complete'),
      },
    });
    expect(getCompletionPercentage(state)).toBe(100);
  });

  test('returns 50 when half of required fields are complete', () => {
    const state = makeState({
      formSchema: makeSchema(['name', 'dob', 'ssn', 'phone']),
      applicationProfile: {
        name: makeProfileEntry('name', 'complete'),
        dob: makeProfileEntry('dob', 'complete'),
      },
    });
    expect(getCompletionPercentage(state)).toBe(50);
  });

  test('counts inferred fields as complete', () => {
    const state = makeState({
      formSchema: makeSchema(['name', 'dob']),
      applicationProfile: {
        name: makeProfileEntry('name', 'inferred'),
        dob: makeProfileEntry('dob', 'complete'),
      },
    });
    expect(getCompletionPercentage(state)).toBe(100);
  });

  test('does not count optional fields in calculation', () => {
    const state = makeState({
      formSchema: makeSchema(['name', 'notes'], ['name']),
      applicationProfile: {
        name: makeProfileEntry('name', 'complete'),
      },
    });
    expect(getCompletionPercentage(state)).toBe(100);
  });

  test('returns 0 when schema is null', () => {
    const state = makeState({ formSchema: null });
    expect(getCompletionPercentage(state)).toBe(0);
  });
});

describe('getFieldStatusMap', () => {
  test('returns missing for all fields when profile is empty', () => {
    const state = makeState({ formSchema: makeSchema(['name', 'dob']) });
    const statusMap = getFieldStatusMap(state);
    expect(statusMap).toEqual({ name: 'missing', dob: 'missing' });
  });

  test('reflects status from profile entries', () => {
    const state = makeState({
      formSchema: makeSchema(['name', 'dob', 'ssn']),
      applicationProfile: {
        name: makeProfileEntry('name', 'complete'),
        dob: makeProfileEntry('dob', 'needs_confirmation'),
      },
    });
    const statusMap = getFieldStatusMap(state);
    expect(statusMap).toEqual({
      name: 'complete',
      dob: 'needs_confirmation',
      ssn: 'missing',
    });
  });

  test('returns empty object when schema is null', () => {
    const state = makeState({ formSchema: null });
    expect(getFieldStatusMap(state)).toEqual({});
  });

  test('handles fields across multiple sections', () => {
    const state = makeState({
      formSchema: {
        id: 'test',
        title: 'Test',
        sections: [
          { id: 's1', title: 'S1', fields: [makeField('name')] },
          { id: 's2', title: 'S2', fields: [makeField('income')] },
        ],
      },
      applicationProfile: {
        name: makeProfileEntry('name', 'complete'),
      },
    });
    const statusMap = getFieldStatusMap(state);
    expect(statusMap).toEqual({ name: 'complete', income: 'missing' });
  });
});

describe('getIssues', () => {
  test('returns missing required issues', () => {
    const state = makeState({ formSchema: makeSchema(['name']) });
    expect(getIssues(state)).toHaveLength(1);
    expect(getIssues(state)[0]).toMatchObject({
      id: 'missing_name',
      type: 'missing_required',
    });
  });
});

describe('getSuggestedNextStep', () => {
  test('returns review_issues when there are issues', () => {
    const state = makeState({
      formSchema: makeSchema(['name']),
      checkIssues: [
        {
          id: 'conflict',
          type: 'contradiction',
          fieldIds: ['name'],
          message: 'Conflict',
          suggestion: 'Fix it',
        },
      ],
    });
    expect(getSuggestedNextStep(state)).toBe('review_issues');
  });

  test('returns add_documents when required docs are needed', () => {
    const state = makeState({
      formSchema: makeSchema(['name']),
      applicationProfile: { name: makeProfileEntry('name', 'complete') },
      documentStatusMap: { proof_of_income: 'needed' },
    });
    expect(getSuggestedNextStep(state)).toBe('add_documents');
  });

  test('returns continue_interview when required fields are missing', () => {
    const state = makeState({
      formSchema: makeSchema(['name', 'dob']),
      applicationProfile: { name: makeProfileEntry('name', 'complete') },
      documentStatusMap: {},
    });
    expect(getSuggestedNextStep(state)).toBe('continue_interview');
  });

  test('returns ready when all fields complete and no docs needed', () => {
    const state = makeState({
      formSchema: makeSchema(['name']),
      applicationProfile: { name: makeProfileEntry('name', 'complete') },
      documentStatusMap: {},
    });
    expect(getSuggestedNextStep(state)).toBe('ready');
  });

  test('returns ready when schema is null', () => {
    const state = makeState({ formSchema: null });
    expect(getSuggestedNextStep(state)).toBe('ready');
  });
});

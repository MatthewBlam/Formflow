import { describe, test, expect, beforeEach } from 'vitest';
import { useFormStore } from '@/store/form-store';

// Access store state directly (non-React context)
function getStore() {
  return useFormStore.getState();
}

beforeEach(() => {
  useFormStore.setState(useFormStore.getInitialState());
});

describe('initial state', () => {
  test('has correct defaults', () => {
    const state = getStore();
    expect(state.formSchema).toBeNull();
    expect(state.extractionStatus).toBe('idle');
    expect(state.extractionError).toBeNull();
    expect(state.pdfUrl).toBeNull();
    expect(state.applicationProfile).toEqual({});
    expect(state.documentStatusMap).toEqual({});
    expect(state.language).toBe('en');
    expect(state.currentPage).toBe(1);
    expect(state.activePanelView).toBeNull();
    expect(state.activeFieldId).toBeNull();
  });
});

describe('setLanguage', () => {
  test('sets language to es', () => {
    getStore().setLanguage('es');
    expect(getStore().language).toBe('es');
  });

  test('sets language back to en', () => {
    getStore().setLanguage('es');
    getStore().setLanguage('en');
    expect(getStore().language).toBe('en');
  });
});

describe('setActiveFieldId', () => {
  test('sets active field id', () => {
    getStore().setActiveFieldId('field-name');
    expect(getStore().activeFieldId).toBe('field-name');
  });

  test('clears active field id with null', () => {
    getStore().setActiveFieldId('field-name');
    getStore().setActiveFieldId(null);
    expect(getStore().activeFieldId).toBeNull();
  });
});

describe('setCurrentPage', () => {
  test('updates current page', () => {
    getStore().setCurrentPage(3);
    expect(getStore().currentPage).toBe(3);
  });
});

describe('setActivePanelView', () => {
  test('sets panel view to interview', () => {
    getStore().setActivePanelView('interview');
    expect(getStore().activePanelView).toBe('interview');
  });

  test('sets panel view to null', () => {
    getStore().setActivePanelView('interview');
    getStore().setActivePanelView(null);
    expect(getStore().activePanelView).toBeNull();
  });
});

describe('updateProfileEntry', () => {
  test('adds a new profile entry', () => {
    const entry = {
      fieldId: 'name',
      value: 'John Doe',
      status: 'complete' as const,
      source: 'interview' as const,
      confidence: 1,
    };
    getStore().updateProfileEntry('name', entry);
    expect(getStore().applicationProfile['name']).toEqual(entry);
  });

  test('overwrites an existing profile entry', () => {
    const first = { fieldId: 'name', value: 'John', status: 'complete' as const, source: 'interview' as const };
    const second = { fieldId: 'name', value: 'Jane', status: 'complete' as const, source: 'interview' as const };
    getStore().updateProfileEntry('name', first);
    getStore().updateProfileEntry('name', second);
    expect(getStore().applicationProfile['name'].value).toBe('Jane');
  });

  test('does not affect other entries', () => {
    const entryA = { fieldId: 'name', value: 'John', status: 'complete' as const, source: 'interview' as const };
    const entryB = { fieldId: 'dob', value: '1980-01-01', status: 'complete' as const, source: 'interview' as const };
    getStore().updateProfileEntry('name', entryA);
    getStore().updateProfileEntry('dob', entryB);
    expect(getStore().applicationProfile['name'].value).toBe('John');
    expect(getStore().applicationProfile['dob'].value).toBe('1980-01-01');
  });
});

describe('setDocumentStatus', () => {
  test('sets a document status', () => {
    getStore().setDocumentStatus('proof_of_income', 'present');
    expect(getStore().documentStatusMap['proof_of_income']).toBe('present');
  });

  test('can update document status', () => {
    getStore().setDocumentStatus('proof_of_income', 'needed');
    getStore().setDocumentStatus('proof_of_income', 'present');
    expect(getStore().documentStatusMap['proof_of_income']).toBe('present');
  });
});

describe('setExtractionStatus', () => {
  test('sets status to processing', () => {
    getStore().setExtractionStatus('processing');
    expect(getStore().extractionStatus).toBe('processing');
  });

  test('sets status to error with message', () => {
    getStore().setExtractionStatus('error', 'Failed to parse PDF');
    expect(getStore().extractionStatus).toBe('error');
    expect(getStore().extractionError).toBe('Failed to parse PDF');
  });

  test('clears error when setting to complete', () => {
    getStore().setExtractionStatus('error', 'some error');
    getStore().setExtractionStatus('complete');
    expect(getStore().extractionStatus).toBe('complete');
    expect(getStore().extractionError).toBeNull();
  });
});

describe('setPdfUrl', () => {
  test('sets pdf url', () => {
    getStore().setPdfUrl('blob:https://example.com/123');
    expect(getStore().pdfUrl).toBe('blob:https://example.com/123');
  });

  test('clears pdf url with null', () => {
    getStore().setPdfUrl('blob:https://example.com/123');
    getStore().setPdfUrl(null);
    expect(getStore().pdfUrl).toBeNull();
  });
});

describe('setFormSchema', () => {
  test('sets form schema', () => {
    const schema = {
      id: 'test',
      title: 'Test Form',
      sections: [],
    };
    getStore().setFormSchema(schema);
    expect(getStore().formSchema).toEqual(schema);
  });

  test('clears form schema with null', () => {
    getStore().setFormSchema({ id: 'test', title: 'Test', sections: [] });
    getStore().setFormSchema(null);
    expect(getStore().formSchema).toBeNull();
  });
});

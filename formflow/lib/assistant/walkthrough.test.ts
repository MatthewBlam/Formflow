import { describe, expect, it } from 'vitest';
import { handleCaseworkerTurn, handleWalkthroughAnswer } from './walkthrough';
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
        currentPage: 1,
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

  it('runs checks after the last required field', () => {
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
        currentPage: 7,
      },
      '05/02/2026'
    );

    expect(result.nextFieldId).toBeNull();
    expect(result.issues?.length).toBeGreaterThan(0);
  });

  it('does not save a greeting as the current answer', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'applicant_name',
        currentPage: 1,
      },
      'hi'
    );

    expect(result.updates).toBeUndefined();
    expect(result.nextFieldId).toBe('applicant_name');
    expect(result.message).toContain('Hi.');
  });

  it('answers a question without saving it as a field answer', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'applicant_name',
        currentPage: 1,
      },
      'why do you need my name?'
    );

    expect(result.updates).toBeUndefined();
    expect(result.nextFieldId).toBe('applicant_name');
    expect(result.message).toContain('Related section');
  });

  it('answers benefit program questions from form context', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'programs_requested',
        currentPage: 1,
      },
      'can you tell me which benefits I can apply for?'
    );

    expect(result.updates).toBeUndefined();
    expect(result.message).toContain('CalFresh');
    expect(result.message).toContain('Medi-Cal');
    expect(result.message).toContain('cannot tell you for sure which ones you qualify for');
  });

  it('maps rough benefit words to a useful form-context answer', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'programs_requested',
        currentPage: 1,
      },
      'food help money'
    );

    expect(result.updates).toBeUndefined();
    expect(result.message).toContain('CalFresh');
    expect(result.message).toContain('Medi-Cal');
  });

  it('maps rough document words before falling back to saving', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'applicant_name',
        currentPage: 1,
      },
      'papers need'
    );

    expect(result.updates).toBeUndefined();
    expect(result.message).toContain('document');
  });

  it('uses the current PDF page when answering page-context questions', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'programs_requested',
        currentPage: 3,
      },
      'what fields are on this page?'
    );

    expect(result.updates).toBeUndefined();
    expect(result.message).toContain('On page 3');
    expect(result.message).toContain('Are you working right now?');
    expect(result.message).toContain('How much money do you earn from work each month before taxes?');
  });

  it('uses explicit page references when answering form questions', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'programs_requested',
        currentPage: 1,
      },
      'on page three what income information is there?'
    );

    expect(result.updates).toBeUndefined();
    expect(result.message).toContain('How much money do you earn from work each month before taxes?');
    expect(result.message).toContain('Related section: Income and work');
  });

  it('updates a saved answer when the user corrects it by field name', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {
          applicant_name: entry('applicant_name', 'Old Name'),
        },
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'birth_date',
        currentPage: 1,
      },
      'change my name to Maria Garcia'
    );

    expect(result.updates?.[0]).toMatchObject({
      fieldId: 'applicant_name',
      value: 'Maria Garcia',
      status: 'complete',
    });
    expect(result.nextFieldId).toBe('applicant_name');
    expect(result.message).toContain('Updated');
  });

  it('treats mistake language as an answer correction instead of a check request', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {
          phone: entry('phone', '555-000-0000'),
        },
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'birth_date',
        currentPage: 1,
      },
      'I made a mistake, my phone is 555-123-4567'
    );

    expect(result.updates?.[0]).toMatchObject({
      fieldId: 'phone',
      value: '555-123-4567',
      status: 'complete',
    });
    expect(result.issues).toBeUndefined();
  });

  it('updates the current field when a correction omits the field name', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {
          date_of_birth: entry('date_of_birth', '01/01/1980'),
        },
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'date_of_birth',
        currentPage: 1,
      },
      'Actually it should be 04/12/1976'
    );

    expect(result.updates?.[0]).toMatchObject({
      fieldId: 'date_of_birth',
      value: '04/12/1976',
      status: 'complete',
    });
  });

  it('answers questions about fields by visual position on a page', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'programs_requested',
        currentPage: 1,
      },
      'what is the right field on page 7?'
    );

    expect(result.updates).toBeUndefined();
    expect(result.message).toContain('What date did you sign it?');
  });

  it('answers questions about fields near another field label', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'programs_requested',
        currentPage: 1,
      },
      'what is the field under the signature line?'
    );

    expect(result.updates).toBeUndefined();
    expect(result.message).toContain('Did you sign the application?');
  });

  it('responds to Spanish greetings in Spanish mode', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'applicant_name',
        currentPage: 1,
        language: 'es',
      },
      'hola'
    );

    expect(result.message).toContain('Hola.');
    expect(result.message).toContain('Cual es su nombre legal completo?');
  });

  it('answers Spanish benefit questions with Spanish text', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {},
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'programs_requested',
        currentPage: 1,
        language: 'es',
      },
      'que beneficios puedo pedir?'
    );

    expect(result.updates).toBeUndefined();
    expect(result.message).toContain('programas de beneficios');
    expect(result.message).toContain('CalFresh');
  });

  it('updates answers from Spanish correction language', () => {
    const result = handleCaseworkerTurn(
      {
        formSchema: saws2PlusForm.schema,
        applicationProfile: {
          phone: entry('phone', '555-000-0000'),
        },
        documentStatusMap: {},
        selectedDemoFormId: saws2PlusForm.id,
        currentFieldId: 'date_of_birth',
        currentPage: 1,
        language: 'es',
      },
      'cambiar mi telefono a 555-123-4567'
    );

    expect(result.updates?.[0]).toMatchObject({
      fieldId: 'phone',
      value: '555-123-4567',
      status: 'complete',
    });
    expect(result.message).toContain('Actualice');
  });
});

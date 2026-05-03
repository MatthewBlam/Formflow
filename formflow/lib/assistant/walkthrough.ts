import type { AssistantMode, Issue, ProfileEntry } from '@/types';
import { getCheckSummary, runChecks } from './check';
import { formatFieldPrompt, getFieldById, getFirstIncompleteRequiredField, getNextIncompleteRequiredField } from './modes';
import { answerQuestion } from './qa';

interface AssistantState {
  formSchema: Parameters<typeof getFirstIncompleteRequiredField>[0]['formSchema'];
  applicationProfile: Record<string, ProfileEntry>;
  documentStatusMap: Record<string, 'needed' | 'present'>;
  selectedDemoFormId: string | null;
  currentFieldId: string | null;
  activeMode: AssistantMode;
}

export interface AssistantResult {
  message: string;
  updates?: ProfileEntry[];
  nextFieldId?: string | null;
  mode?: AssistantMode;
  issues?: Issue[];
}

function savedFieldText(label: string) {
  const trimmed = label.trim();
  const punctuation = /[.!?]$/.test(trimmed) ? '' : '.';
  return `Saved "${trimmed}${punctuation}"`;
}

export function getInitialAssistantMessage(state: AssistantState): AssistantResult {
  const field = getFirstIncompleteRequiredField(state);
  if (!field) {
    const issues = runChecks(state);
    return {
      message: `I can review this form now. ${getCheckSummary(issues)}`,
      mode: 'check',
      nextFieldId: null,
      issues,
    };
  }

  return {
    message: `Let's start with the first missing required item.\n\n${formatFieldPrompt(field)}`,
    mode: 'walkthrough',
    nextFieldId: field.id,
  };
}

export function handleWalkthroughAnswer(state: AssistantState, userText: string): AssistantResult {
  const currentField =
    getFieldById(state.formSchema, state.currentFieldId) ?? getFirstIncompleteRequiredField(state);

  if (!currentField) {
    const issues = runChecks(state);
    return {
      message: `All required guided fields have answers. ${getCheckSummary(issues)}`,
      mode: 'check',
      nextFieldId: null,
      issues,
    };
  }

  const trimmed = userText.trim();
  const uncertain = /^(not sure|i'?m not sure|unknown|skip|maybe|unsure)$/i.test(trimmed);
  const update: ProfileEntry = {
    fieldId: currentField.id,
    value: trimmed,
    status: uncertain ? 'needs_confirmation' : 'complete',
    source: 'interview',
    confidence: uncertain ? 0.35 : 1,
  };

  const simulatedState = {
    ...state,
    applicationProfile: {
      ...state.applicationProfile,
      [currentField.id]: update,
    },
  };
  const nextField = getNextIncompleteRequiredField(simulatedState, currentField.id);

  if (!nextField) {
    const issues = runChecks(simulatedState);
    return {
      message: `${savedFieldText(currentField.plainLanguageLabel ?? currentField.label)} That was the last required guided field. ${getCheckSummary(issues)}`,
      updates: [update],
      nextFieldId: null,
      mode: 'check',
      issues,
    };
  }

  return {
    message: `${savedFieldText(currentField.plainLanguageLabel ?? currentField.label)}\n\nNext: ${formatFieldPrompt(nextField)}`,
    updates: [update],
    nextFieldId: nextField.id,
    mode: 'walkthrough',
  };
}

export function handleAssistantTurn(state: AssistantState, userText: string): AssistantResult {
  if (state.activeMode === 'qa') {
    return { message: answerQuestion(state, userText), mode: 'qa' };
  }

  if (state.activeMode === 'check') {
    const issues = runChecks(state);
    return {
      message: getCheckSummary(issues),
      issues,
      mode: 'check',
      nextFieldId: issues[0]?.fieldIds[0] ?? state.currentFieldId,
    };
  }

  return handleWalkthroughAnswer(state, userText);
}

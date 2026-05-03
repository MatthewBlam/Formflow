import type { Issue, ProfileEntry } from '@/types';
import { getCheckSummary, runChecks } from './check';
import { formatFieldPrompt, getAllFields, getFieldById, getFirstIncompleteRequiredField, getNextIncompleteRequiredField } from './modes';
import { answerQuestion, bestMatchingField, extractPageReference, fieldByVisualReference, fieldsForPage, inferRelatedQuestion } from './qa';

interface AssistantState {
  formSchema: Parameters<typeof getFirstIncompleteRequiredField>[0]['formSchema'];
  applicationProfile: Record<string, ProfileEntry>;
  documentStatusMap: Record<string, 'needed' | 'present'>;
  selectedDemoFormId: string | null;
  currentFieldId: string | null;
  currentPage: number;
}

export interface AssistantResult {
  message: string;
  updates?: ProfileEntry[];
  nextFieldId?: string | null;
  issues?: Issue[];
}

const GREETING_RE = /^(hi|hello|hey|yo|good morning|good afternoon|good evening)\b[!. ]*$/i;
const THANKS_RE = /^(thanks|thank you|thx|appreciate it)\b[!. ]*$/i;
const UNSURE_RE = /^(not sure|i'?m not sure|unknown|skip|maybe|unsure|i don'?t know)$/i;
const HELP_RE = /\b(help|what can you do|how does this work|walk me through|guide me|start over|continue)\b/i;
const CHECK_RE = /\b(check|review|scan|inconsisten|mistake|issue|problem)\b/i;
const QUESTION_RE = /(^|\b)(what|why|where|when|who|how|can|should|do|does|is|are)\b|[?]/i;
const CORRECTION_RE = /\b(change|update|correct|fix|revise|edit|set|mistake|wrong|actually|should be)\b/i;

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
      nextFieldId: null,
      issues,
    };
  }

  return {
    message: `Hi, I can help like a case worker: I can answer questions, explain what the form is asking, or walk through the fields with you.\n\nA good place to start is this required item:\n\n${formatFieldPrompt(field)}`,
    nextFieldId: field.id,
  };
}

function cleanExplicitAnswer(text: string) {
  return text
    .replace(/^(my answer is|the answer is|it is|it's|that is|my name is|i am|i'm)\s+/i, '')
    .trim();
}

function optionMatch(value: string, options: string[] | undefined) {
  if (!options?.length) return false;
  const normalized = value.toLowerCase();
  return options.some((option) => normalized.includes(option.toLowerCase()));
}

function stripTrailingPunctuation(value: string) {
  return value.trim().replace(/[.!?]+$/g, '').trim();
}

function parseCorrectionParts(input: string) {
  const trimmed = input.trim();
  const currentFieldCorrection = trimmed.match(/\b(?:actually|mistake|wrong)\b.*?\b(?:it|that|this|answer)\s*(?:is|should be|needs to be|to)\s+(.+)$/i);
  if (currentFieldCorrection?.[1]) {
    const value = stripTrailingPunctuation(currentFieldCorrection[1]);
    if (value) return { target: null, value };
  }

  const patterns = [
    /\b(?:change|update|correct|fix|revise|edit|set)\s+(?:my\s+|the\s+)?(.+?)\s+(?:to|as|is|should be)\s+(.+)$/i,
    /\b(?:actually|mistake|wrong)\b.*?\b(?:my\s+|the\s+)?(.+?)\s+(?:is|should be|needs to be|to)\s+(.+)$/i,
    /\b(?:my\s+|the\s+)?(.+?)\s+should be\s+(.+)$/i,
    /\bmy\s+(.+?)\s+is\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (!match) continue;
    const target = stripTrailingPunctuation(match[1]);
    const value = stripTrailingPunctuation(match[2]);
    if (target && value) return { target, value };
  }

  return null;
}

function handleCorrection(state: AssistantState, userText: string): AssistantResult | null {
  if (!CORRECTION_RE.test(userText)) return null;

  const parts = parseCorrectionParts(userText);
  if (!parts || !state.formSchema) {
    return {
      message: 'I can help change a saved answer. Tell me the field and the new answer, like: "change phone number to 555-123-4567."',
      nextFieldId: state.currentFieldId,
    };
  }

  const referencedPage = extractPageReference(userText, state.currentPage);
  const candidateFields = referencedPage ? fieldsForPage(state.formSchema, referencedPage) : getAllFields(state.formSchema);
  const currentField = getFieldById(state.formSchema, state.currentFieldId);
  const currentFieldTarget =
    currentField && (!parts.target || /\b(this|that|current|current answer|answer|it)\b/i.test(parts.target))
      ? currentField
      : null;
  const visualTarget = fieldByVisualReference(state.formSchema, userText, state.currentPage);
  const targetField = currentFieldTarget ?? visualTarget ?? bestMatchingField(candidateFields, parts.target ?? userText);

  if (!targetField) {
    const pageText = referencedPage ? ` on page ${referencedPage}` : '';
    return {
      message: `I can change that, but I am not sure which field${pageText} you mean. Please name the field and the new answer, like: "change date of birth to 04/12/1976."`,
      nextFieldId: state.currentFieldId,
    };
  }

  const update: ProfileEntry = {
    fieldId: targetField.id,
    value: parts.value,
    status: 'complete',
    source: 'interview',
    confidence: 1,
  };

  return {
    message: `Updated "${targetField.plainLanguageLabel ?? targetField.label}" to: ${parts.value}.`,
    updates: [update],
    nextFieldId: targetField.id,
  };
}

function looksLikeAnswerForCurrentField(state: AssistantState, userText: string) {
  const field = getFieldById(state.formSchema, state.currentFieldId) ?? getFirstIncompleteRequiredField(state);
  if (!field) return null;

  const trimmed = userText.trim();
  const cleaned = cleanExplicitAnswer(trimmed);
  const lower = trimmed.toLowerCase();
  const fieldText = `${field.id} ${field.label} ${field.plainLanguageLabel ?? ''}`.toLowerCase();
  const explicitAnswer = /^(my answer is|the answer is|it is|it's|that is|my name is|i am|i'm)\s+/i.test(trimmed);

  if (!cleaned || GREETING_RE.test(trimmed) || THANKS_RE.test(trimmed) || QUESTION_RE.test(trimmed)) {
    return null;
  }

  if (UNSURE_RE.test(trimmed)) {
    return { field, value: trimmed, uncertain: true };
  }

  if (field.type === 'date') {
    return /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(cleaned) ||
      /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(cleaned)
      ? { field, value: cleaned, uncertain: false }
      : null;
  }

  if (field.type === 'number') {
    return /\d/.test(cleaned) ? { field, value: cleaned, uncertain: false } : null;
  }

  if (field.type === 'select' || field.type === 'checkbox') {
    return optionMatch(cleaned, field.options) || /\b(yes|no|not sure|none|same)\b/i.test(cleaned)
      ? { field, value: cleaned, uncertain: false }
      : null;
  }

  if (fieldText.includes('name')) {
    const words = cleaned.split(/\s+/).filter(Boolean);
    return explicitAnswer || words.length >= 2 ? { field, value: cleaned, uncertain: false } : null;
  }

  if (fieldText.includes('phone')) {
    return /\d{3}[-. )]?\d{3}[-. ]?\d{4}/.test(cleaned)
      ? { field, value: cleaned, uncertain: false }
      : null;
  }

  if (fieldText.includes('address')) {
    return /\d+/.test(cleaned) || /\b(same|homeless|shelter|po box|p\.o\.)\b/i.test(cleaned)
      ? { field, value: cleaned, uncertain: false }
      : null;
  }

  if (fieldText.includes('city') || fieldText.includes('zip')) {
    return /,/.test(cleaned) || /\b[A-Z]{2}\b/.test(cleaned) || /\d{5}/.test(cleaned)
      ? { field, value: cleaned, uncertain: false }
      : null;
  }

  if (fieldText.includes('household member')) {
    return cleaned.includes(',') || cleaned.split(/\s+/).length >= 2
      ? { field, value: cleaned, uncertain: false }
      : null;
  }

  if (explicitAnswer || cleaned.length >= 3) {
    return { field, value: cleaned, uncertain: false };
  }

  void lower;
  return null;
}

export function handleWalkthroughAnswer(state: AssistantState, userText: string): AssistantResult {
  const currentField =
    getFieldById(state.formSchema, state.currentFieldId) ?? getFirstIncompleteRequiredField(state);

  if (!currentField) {
    const issues = runChecks(state);
    return {
      message: `All required guided fields have answers. ${getCheckSummary(issues)}`,
      nextFieldId: null,
      issues,
    };
  }

  const answer = looksLikeAnswerForCurrentField(state, userText);
  if (!answer || answer.field.id !== currentField.id) {
    return {
      message: `I do not want to save that as "${currentField.plainLanguageLabel ?? currentField.label}" unless you mean it as your answer.\n\n${formatFieldPrompt(currentField)}`,
      nextFieldId: currentField.id,
    };
  }

  const update: ProfileEntry = {
    fieldId: currentField.id,
    value: answer.value,
    status: answer.uncertain ? 'needs_confirmation' : 'complete',
    source: 'interview',
    confidence: answer.uncertain ? 0.35 : 1,
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
      issues,
    };
  }

  return {
    message: `${savedFieldText(currentField.plainLanguageLabel ?? currentField.label)}\n\nNext: ${formatFieldPrompt(nextField)}`,
    updates: [update],
    nextFieldId: nextField.id,
  };
}

export function handleCaseworkerTurn(state: AssistantState, userText: string): AssistantResult {
  const trimmed = userText.trim();
  const currentField = getFieldById(state.formSchema, state.currentFieldId) ?? getFirstIncompleteRequiredField(state);

  if (GREETING_RE.test(trimmed)) {
    return {
      message: currentField
        ? `Hi. I can help with this form one step at a time. Right now we are on: ${currentField.plainLanguageLabel ?? currentField.label}. You can answer it, ask why it matters, or ask me to check what you have so far.`
        : 'Hi. I can answer questions about this form or check what you have entered so far.',
      nextFieldId: currentField?.id ?? null,
    };
  }

  if (THANKS_RE.test(trimmed)) {
    return {
      message: currentField
        ? `You are welcome. We can keep going whenever you are ready.\n\n${formatFieldPrompt(currentField)}`
        : 'You are welcome. You can ask me a form question or use the check button when you want a review.',
      nextFieldId: currentField?.id ?? null,
    };
  }

  const correction = handleCorrection(state, trimmed);
  if (correction) {
    return correction;
  }

  if (CHECK_RE.test(trimmed)) {
    const issues = runChecks(state);
    return {
      message: `I checked your answers so far. ${getCheckSummary(issues)}`,
      issues,
      nextFieldId: issues[0]?.fieldIds[0] ?? state.currentFieldId,
    };
  }

  if (HELP_RE.test(trimmed)) {
    const field = currentField ?? getFirstIncompleteRequiredField(state);
    return {
      message: field
        ? `We can continue with the next required item.\n\n${formatFieldPrompt(field)}`
        : 'You have answered the required guided fields. Use the check button and I will review for missing items, document reminders, and inconsistencies.',
      nextFieldId: field?.id ?? null,
    };
  }

  if (QUESTION_RE.test(trimmed)) {
    return {
      message: answerQuestion(state, trimmed),
      nextFieldId: currentField?.id ?? null,
    };
  }

  const relatedQuestion = inferRelatedQuestion(trimmed);
  if (relatedQuestion) {
    return {
      message: answerQuestion(state, `${relatedQuestion} ${trimmed}`),
      nextFieldId: currentField?.id ?? null,
    };
  }

  return handleWalkthroughAnswer(state, userText);
}

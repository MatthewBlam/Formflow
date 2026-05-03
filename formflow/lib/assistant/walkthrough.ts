import type { FormField, FormFlowState, Issue, ProfileEntry } from '@/types';
import { getCheckSummary, runChecks } from './check';
import { formatFieldPrompt, getAllFields, getFieldById, getFirstIncompleteRequiredField, getNextIncompleteRequiredField } from './modes';
import { answerQuestion, bestMatchingField, extractPageReference, fieldByVisualReference, fieldDisplayName, fieldsForPage, inferRelatedQuestion } from './qa';

interface AssistantState {
  formSchema: Parameters<typeof getFirstIncompleteRequiredField>[0]['formSchema'];
  applicationProfile: Record<string, ProfileEntry>;
  documentStatusMap: Record<string, 'needed' | 'present'>;
  selectedDemoFormId: string | null;
  currentFieldId: string | null;
  currentPage: number;
  language?: FormFlowState['language'];
}

export interface AssistantResult {
  message: string;
  updates?: ProfileEntry[];
  nextFieldId?: string | null;
  issues?: Issue[];
}

const GREETING_RE = /^(hi|hello|hey|yo|good morning|good afternoon|good evening|hola|buenos dias|buenas tardes|buenas noches)\b[!. ]*$/i;
const THANKS_RE = /^(thanks|thank you|thx|appreciate it|gracias|muchas gracias)\b[!. ]*$/i;
const UNSURE_RE = /^(not sure|i'?m not sure|unknown|skip|maybe|unsure|i don'?t know|no se|no sé|no estoy seguro|saltar|tal vez)$/i;
const HELP_RE = /\b(help|what can you do|how does this work|walk me through|guide me|start over|continue|ayuda|ayudame|ayúdame|que puedes hacer|cómo funciona|como funciona|guiame|guíame|continuar)\b/i;
const CHECK_RE = /\b(check|review|scan|inconsisten|mistake|issue|problem|revisar|checar|escanea|inconsisten|error|problema)\b/i;
const QUESTION_RE = /(^|\b)(what|why|where|when|who|how|can|should|do|does|is|are|que|qué|por que|por qué|donde|dónde|cuando|cuándo|quien|quién|como|cómo|puedo|debo|es|son)\b|[?¿]/i;
const CORRECTION_RE = /\b(change|update|correct|fix|revise|edit|set|mistake|wrong|actually|should be|cambiar|actualizar|corregir|arreglar|editar|poner|error|equivocado|en realidad|debe ser|deberia ser|debería ser)\b/i;

function languageOf(state: Pick<AssistantState, 'language'>) {
  return state.language === 'es' ? 'es' : 'en';
}

function localizedFieldPrompt(field: FormField, language: FormFlowState['language']) {
  if (language !== 'es') return formatFieldPrompt(field);
  const parts = [
    fieldDisplayName(field, language),
    'Por que importa: Esto ayuda al condado a revisar su solicitud.',
    field.exampleAnswer ? `Ejemplo: ${field.exampleAnswer}` : null,
  ].filter(Boolean);

  return `${parts.join('\n\n')}\n\nQue debo poner aqui?`;
}

function savedFieldText(label: string, language: FormFlowState['language']) {
  const trimmed = label.trim();
  const punctuation = /[.!?]$/.test(trimmed) ? '' : '.';
  if (language === 'es') return `Guardado "${trimmed}${punctuation}"`;
  return `Saved "${trimmed}${punctuation}"`;
}

export function getInitialAssistantMessage(state: AssistantState): AssistantResult {
  const language = languageOf(state);
  const field = getFirstIncompleteRequiredField(state);
  if (!field) {
    const issues = runChecks(state);
    return {
      message:
        language === 'es'
          ? `Ya puedo revisar este formulario. ${getCheckSummary(issues)}`
          : `I can review this form now. ${getCheckSummary(issues)}`,
      nextFieldId: null,
      issues,
    };
  }

  return {
    message:
      language === 'es'
        ? `Hola, puedo ayudar como trabajador de caso: puedo contestar preguntas, explicar lo que pide el formulario, o guiarle por los campos.\n\nUn buen lugar para empezar es este punto requerido:\n\n${localizedFieldPrompt(field, language)}`
        : `Hi, I can help like a case worker: I can answer questions, explain what the form is asking, or walk through the fields with you.\n\nA good place to start is this required item:\n\n${localizedFieldPrompt(field, language)}`,
    nextFieldId: field.id,
  };
}

function cleanExplicitAnswer(text: string) {
  return text
    .replace(/^(my answer is|the answer is|it is|it's|that is|my name is|i am|i'm)\s+/i, '')
    .replace(/^(mi respuesta es|la respuesta es|es|mi nombre es|me llamo|soy)\s+/i, '')
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
  const currentFieldCorrection = trimmed.match(/\b(?:actually|mistake|wrong|en realidad|error|equivocado)\b.*?\b(?:it|that|this|answer|esto|eso|respuesta)\s*(?:is|should be|needs to be|to|es|debe ser|deberia ser|debería ser)\s+(.+)$/i);
  if (currentFieldCorrection?.[1]) {
    const value = stripTrailingPunctuation(currentFieldCorrection[1]);
    if (value) return { target: null, value };
  }

  const patterns = [
    /\b(?:change|update|correct|fix|revise|edit|set|cambiar|actualizar|corregir|arreglar|editar|poner)\s+(?:my\s+|the\s+|mi\s+|el\s+|la\s+)?(.+?)\s+(?:to|as|is|should be|a|como|es|debe ser|deberia ser|debería ser)\s+(.+)$/i,
    /\b(?:actually|mistake|wrong|en realidad|error|equivocado)\b.*?\b(?:my\s+|the\s+|mi\s+|el\s+|la\s+)?(.+?)\s+(?:is|should be|needs to be|to|es|debe ser|deberia ser|debería ser|a)\s+(.+)$/i,
    /\b(?:my\s+|the\s+|mi\s+|el\s+|la\s+)?(.+?)\s+(?:should be|debe ser|deberia ser|debería ser)\s+(.+)$/i,
    /\b(?:my|mi)\s+(.+?)\s+(?:is|es)\s+(.+)$/i,
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
  const language = languageOf(state);

  const parts = parseCorrectionParts(userText);
  if (!parts || !state.formSchema) {
    return {
      message:
        language === 'es'
          ? 'Puedo ayudar a cambiar una respuesta guardada. Digame el campo y la nueva respuesta, como: "cambiar telefono a 555-123-4567."'
          : 'I can help change a saved answer. Tell me the field and the new answer, like: "change phone number to 555-123-4567."',
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
    const pageText = referencedPage ? (language === 'es' ? ` en la pagina ${referencedPage}` : ` on page ${referencedPage}`) : '';
    return {
      message:
        language === 'es'
          ? `Puedo cambiar eso, pero no estoy seguro a que campo${pageText} se refiere. Nombre el campo y la nueva respuesta, como: "cambiar fecha de nacimiento a 04/12/1976."`
          : `I can change that, but I am not sure which field${pageText} you mean. Please name the field and the new answer, like: "change date of birth to 04/12/1976."`,
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
    message:
      language === 'es'
        ? `Actualice "${fieldDisplayName(targetField, language)}" a: ${parts.value}.`
        : `Updated "${fieldDisplayName(targetField, language)}" to: ${parts.value}.`,
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
  const explicitAnswer = /^(my answer is|the answer is|it is|it's|that is|my name is|i am|i'm|mi respuesta es|la respuesta es|mi nombre es|me llamo|soy)\s+/i.test(trimmed);

  if (!cleaned || GREETING_RE.test(trimmed) || THANKS_RE.test(trimmed) || QUESTION_RE.test(trimmed)) {
    return null;
  }

  if (UNSURE_RE.test(trimmed)) {
    return { field, value: trimmed, uncertain: true };
  }

  if (field.type === 'date') {
    return /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(cleaned) ||
      /\b(january|february|march|april|may|june|july|august|september|october|november|december|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/i.test(cleaned)
      ? { field, value: cleaned, uncertain: false }
      : null;
  }

  if (field.type === 'number') {
    return /\d/.test(cleaned) ? { field, value: cleaned, uncertain: false } : null;
  }

  if (field.type === 'select' || field.type === 'checkbox') {
    return optionMatch(cleaned, field.options) || /\b(yes|no|not sure|none|same|si|sí|no se|no sé|ninguno|igual)\b/i.test(cleaned)
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
  const language = languageOf(state);
  const currentField =
    getFieldById(state.formSchema, state.currentFieldId) ?? getFirstIncompleteRequiredField(state);

  if (!currentField) {
    const issues = runChecks(state);
    return {
      message:
        language === 'es'
          ? `Todos los campos guiados requeridos tienen respuestas. ${getCheckSummary(issues)}`
          : `All required guided fields have answers. ${getCheckSummary(issues)}`,
      nextFieldId: null,
      issues,
    };
  }

  const answer = looksLikeAnswerForCurrentField(state, userText);
  if (!answer || answer.field.id !== currentField.id) {
    return {
      message:
        language === 'es'
          ? `No quiero guardar eso como "${fieldDisplayName(currentField, language)}" a menos que sea su respuesta.\n\n${localizedFieldPrompt(currentField, language)}`
          : `I do not want to save that as "${fieldDisplayName(currentField, language)}" unless you mean it as your answer.\n\n${localizedFieldPrompt(currentField, language)}`,
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
      message:
        language === 'es'
          ? `${savedFieldText(fieldDisplayName(currentField, language), language)} Ese fue el ultimo campo guiado requerido. ${getCheckSummary(issues)}`
          : `${savedFieldText(fieldDisplayName(currentField, language), language)} That was the last required guided field. ${getCheckSummary(issues)}`,
      updates: [update],
      nextFieldId: null,
      issues,
    };
  }

  return {
    message:
      language === 'es'
        ? `${savedFieldText(fieldDisplayName(currentField, language), language)}\n\nSiguiente: ${localizedFieldPrompt(nextField, language)}`
        : `${savedFieldText(fieldDisplayName(currentField, language), language)}\n\nNext: ${localizedFieldPrompt(nextField, language)}`,
    updates: [update],
    nextFieldId: nextField.id,
  };
}

export function handleCaseworkerTurn(state: AssistantState, userText: string): AssistantResult {
  const trimmed = userText.trim();
  const language = languageOf(state);
  const currentField = getFieldById(state.formSchema, state.currentFieldId) ?? getFirstIncompleteRequiredField(state);

  if (GREETING_RE.test(trimmed)) {
    return {
      message: currentField
        ? language === 'es'
          ? `Hola. Puedo ayudar con este formulario paso a paso. Ahora estamos en: ${fieldDisplayName(currentField, language)}. Puede contestarlo, preguntar por que importa, o pedirme que revise lo que tiene.`
          : `Hi. I can help with this form one step at a time. Right now we are on: ${fieldDisplayName(currentField, language)}. You can answer it, ask why it matters, or ask me to check what you have so far.`
        : language === 'es'
          ? 'Hola. Puedo contestar preguntas sobre este formulario o revisar lo que ha ingresado.'
          : 'Hi. I can answer questions about this form or check what you have entered so far.',
      nextFieldId: currentField?.id ?? null,
    };
  }

  if (THANKS_RE.test(trimmed)) {
    return {
      message: currentField
        ? language === 'es'
          ? `De nada. Podemos seguir cuando este listo.\n\n${localizedFieldPrompt(currentField, language)}`
          : `You are welcome. We can keep going whenever you are ready.\n\n${localizedFieldPrompt(currentField, language)}`
        : language === 'es'
          ? 'De nada. Puede hacerme una pregunta del formulario o usar el boton de revisar cuando quiera.'
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
      message:
        language === 'es'
          ? `Revise sus respuestas hasta ahora. ${getCheckSummary(issues)}`
          : `I checked your answers so far. ${getCheckSummary(issues)}`,
      issues,
      nextFieldId: issues[0]?.fieldIds[0] ?? state.currentFieldId,
    };
  }

  if (HELP_RE.test(trimmed)) {
    const field = currentField ?? getFirstIncompleteRequiredField(state);
    return {
      message: field
        ? language === 'es'
          ? `Podemos continuar con el siguiente punto requerido.\n\n${localizedFieldPrompt(field, language)}`
          : `We can continue with the next required item.\n\n${localizedFieldPrompt(field, language)}`
        : language === 'es'
          ? 'Ya contesto los campos guiados requeridos. Use el boton de revisar y revisare campos faltantes, recordatorios de documentos e inconsistencias.'
          : 'You have answered the required guided fields. Use the check button and I will review for missing items, document reminders, and inconsistencies.',
      nextFieldId: field?.id ?? null,
    };
  }

  if (QUESTION_RE.test(trimmed)) {
    return {
      message: answerQuestion({ ...state, language }, trimmed),
      nextFieldId: currentField?.id ?? null,
    };
  }

  const relatedQuestion = inferRelatedQuestion(trimmed);
  if (relatedQuestion) {
    return {
      message: answerQuestion({ ...state, language }, `${relatedQuestion} ${trimmed}`),
      nextFieldId: currentField?.id ?? null,
    };
  }

  return handleWalkthroughAnswer(state, userText);
}

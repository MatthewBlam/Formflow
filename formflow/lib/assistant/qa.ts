import type { FormField, FormFlowState, FormSchema } from '@/types';
import { getAllFields, getFieldById, getSectionForField } from './modes';

const DOCUMENT_TERMS = [
  'document',
  'documents',
  'proof',
  'paper',
  'papers',
  'pay stub',
  'paystub',
  'id',
  'bring',
  'show',
  'verify',
];
const BLANK_TERMS = ['blank', 'skip', 'leave empty', 'required', 'optional'];
const PROGRAM_TERMS = [
  'benefit',
  'benefits',
  'program',
  'programs',
  'apply for',
  'available',
  'calfresh',
  'medi-cal',
  'medical',
  'food stamps',
  'food help',
  'cash aid',
  'general assistance',
  'health coverage',
  'help with food',
  'help with money',
  'money help',
];
const OPTION_TERMS = ['option', 'options', 'choice', 'choices', 'available', 'select', 'choose'];
const STOP_WORDS = new Set([
  'about',
  'apply',
  'available',
  'because',
  'benefits',
  'could',
  'does',
  'field',
  'form',
  'from',
  'have',
  'information',
  'need',
  'page',
  'question',
  'should',
  'that',
  'there',
  'this',
  'want',
  'what',
  'which',
  'with',
  'your',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
]);
const PAGE_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function inferRelatedQuestion(input: string) {
  const normalized = input.toLowerCase();

  if (includesAny(normalized, PROGRAM_TERMS)) {
    return 'what benefit programs are available on this form?';
  }

  if (includesAny(normalized, DOCUMENT_TERMS)) {
    return 'what documents or proof do I need?';
  }

  if (/\b(missing|left|still need|finish|done|complete|next|todo|to do)\b/i.test(normalized)) {
    return 'what is still missing?';
  }

  if (/\b(confused|confusing|understand|explain|mean|means|simple|translate)\b/i.test(normalized)) {
    return 'can you explain the current question in simple words?';
  }

  if (/\b(qualify|eligible|eligibility|can i get|do i get|allowed)\b/i.test(normalized)) {
    return 'can you tell me which benefits I can apply for?';
  }

  if (/\b(address|where live|mail|homeless|house|apartment)\b/i.test(normalized)) {
    return 'what address information does this form ask for?';
  }

  if (/\b(income|job|work|salary|pay|wage|money)\b/i.test(normalized)) {
    return 'what income information does this form ask for?';
  }

  if (/\b(family|household|people|kids|children|spouse|member)\b/i.test(normalized)) {
    return 'what household information does this form ask for?';
  }

  return null;
}

function words(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

export function bestMatchingField(fields: FormField[], question: string) {
  const questionWords = words(question);
  if (questionWords.length === 0) return null;

  const scored = fields
    .map((field) => {
      const fieldWords = new Set(words(`${field.id} ${field.label} ${field.plainLanguageLabel ?? ''}`));
      const matches = questionWords.filter((word) => fieldWords.has(word)).length;
      return { field, score: matches / questionWords.length };
    })
    .filter(({ score }) => score >= 0.45)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.field ?? null;
}

export function extractPageReference(input: string, currentPage?: number) {
  const normalized = input.toLowerCase();
  const explicit = normalized.match(
    /\bpage\s+(?:number\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/
  );
  if (explicit) {
    const numericPage = Number(explicit[1]);
    return Number.isFinite(numericPage) ? numericPage : PAGE_WORDS[explicit[1]];
  }

  if (
    currentPage &&
    /\b(this page|current page|same page|the page i'?m on|page i'?m on|on this page|on the current page)\b/i.test(input)
  ) {
    return currentPage;
  }

  return null;
}

export function fieldsForPage(schema: FormSchema, page: number) {
  return getAllFields(schema).filter((field) => field.page === page);
}

function programField(fields: ReturnType<typeof getAllFields>) {
  return (
    fields.find((field) => field.id === 'programs_requested') ??
    fields.find((field) => /benefits|programs|apply/i.test(`${field.label} ${field.plainLanguageLabel ?? ''}`)) ??
    null
  );
}

export function answerFieldContext(
  state: Pick<FormFlowState, 'formSchema' | 'applicationProfile'>,
  fieldId: string
) {
  const field = getFieldById(state.formSchema, fieldId);
  if (!field) return null;
  const section = getSectionForField(state.formSchema, field.id);
  const entry = state.applicationProfile[field.id];
  const options = field.options?.length ? ` Options on this form: ${field.options.join(', ')}.` : '';
  return `${field.plainLanguageLabel ?? field.label}: ${field.whyAsking ?? 'This helps the county review your application.'}${options} Related section: ${section?.title ?? 'Unknown section'}.${entry?.value ? ` Current answer: ${entry.value}.` : ' No answer is saved yet.'}`;
}

function summarizePage(schema: FormSchema, page: number) {
  const pageFields = fieldsForPage(schema, page);
  if (pageFields.length === 0) {
    return `I do not have guided field context indexed for page ${page}. You can still ask about a label you see there, or move to a page with guided fields and ask about that page.`;
  }

  const sectionTitles = Array.from(
    new Set(
      pageFields
        .map((field) => getSectionForField(schema, field.id)?.title)
        .filter(Boolean)
    )
  );
  const fieldLabels = pageFields.map((field) => field.plainLanguageLabel ?? field.label).join(', ');
  return `On page ${page}, my guided context includes ${pageFields.length} field${pageFields.length === 1 ? '' : 's'}${sectionTitles.length ? ` in ${sectionTitles.join(', ')}` : ''}: ${fieldLabels}.`;
}

export function answerQuestion(
  state: Pick<FormFlowState, 'formSchema' | 'applicationProfile' | 'documentStatusMap' | 'currentFieldId' | 'currentPage'>,
  question: string
) {
  const schema = state.formSchema;
  if (!schema) {
    return 'Load a form first, then I can answer questions about fields, documents, and what is still missing.';
  }

  const normalized = question.toLowerCase();
  const fields = getAllFields(schema);
  const referencedPage = extractPageReference(question, state.currentPage);
  const scopedFields = referencedPage ? fieldsForPage(schema, referencedPage) : fields;

  if (includesAny(normalized, PROGRAM_TERMS)) {
    const field = programField(fields);
    const options = field?.options ?? [];
    if (options.length > 0) {
      return `This form can be used to ask the county to look at these benefit programs: ${options.join(', ')}. I cannot tell you for sure which ones you qualify for, but you can choose the programs you want the county to evaluate. If you are not sure, it is usually okay to select the programs you want help with and let the county review eligibility.`;
    }
    return 'This form is for asking the county to review benefit programs. I can help identify the program choices shown on the form, but I cannot guarantee eligibility.';
  }

  if (normalized.includes('what form') || normalized.includes('what is this form') || normalized.includes('what does this form')) {
    const sections = schema.sections.map((section) => section.title).join(', ');
    return `${schema.title} is a benefits application packet. The guided context I have includes these sections: ${sections}. I can explain any section or help you answer the fields one at a time.`;
  }

  if (
    referencedPage &&
    (normalized.includes('this page') ||
      normalized.includes('current page') ||
      normalized.includes(`page ${referencedPage}`) ||
      normalized.includes('fields') ||
      normalized.includes('questions') ||
      normalized.includes('what is on') ||
      normalized.includes('what is there') ||
      normalized.includes('asking'))
  ) {
    const matchingFieldOnPage = bestMatchingField(scopedFields, question);
    if (!matchingFieldOnPage || normalized.includes('fields') || normalized.includes('questions')) {
      return summarizePage(schema, referencedPage);
    }
  }

  if (normalized.includes('section') || normalized.includes('fields') || normalized.includes('questions on')) {
    return `I see ${schema.sections.length} main sections in this guided form context: ${schema.sections
      .map((section) => section.title)
      .join(', ')}.`;
  }

  if (referencedPage && scopedFields.length === 0) {
    return summarizePage(schema, referencedPage);
  }

  if (includesAny(normalized, DOCUMENT_TERMS)) {
    const docs = schema.documentRequirements ?? [];
    const needed = docs.filter((doc) => state.documentStatusMap[doc.id] !== 'present');
    if (needed.length === 0) {
      return 'All listed documents are marked present. You should still bring the originals or copies that the county asks for.';
    }
    return `You still have ${needed.length} document item${needed.length === 1 ? '' : 's'} marked needed: ${needed
      .map((doc) => doc.title)
      .join(', ')}.`;
  }

  const currentFieldQuestion =
    /\b(this|that|it|current question)\b/i.test(question) ||
    (/^why\b/i.test(question) && state.currentFieldId);
  if (currentFieldQuestion && state.currentFieldId) {
    const response = answerFieldContext(state, state.currentFieldId);
    if (response) return response;
  }

  const matchingField = bestMatchingField(scopedFields, question);
  if (matchingField) {
    if (includesAny(normalized, BLANK_TERMS)) {
      return `${matchingField.plainLanguageLabel ?? matchingField.label} is ${matchingField.required ? 'required for this guided packet' : 'optional or situation-dependent'}. ${matchingField.required ? 'If you do not know it, mark it for review instead of guessing.' : 'You can leave it blank if it does not apply.'}`;
    }
    const wantsOptions = includesAny(normalized, OPTION_TERMS);
    if (wantsOptions && matchingField.options?.length) {
      return `For "${matchingField.plainLanguageLabel ?? matchingField.label}", the options shown in this guided form context are: ${matchingField.options.join(', ')}.`;
    }
    return answerFieldContext(state, matchingField.id)!;
  }

  if (referencedPage) {
    return summarizePage(schema, referencedPage);
  }

  if (normalized.includes('progress') || normalized.includes('missing')) {
    const missing = fields.filter((field) => field.required && !state.applicationProfile[field.id]?.value.trim());
    if (missing.length === 0) {
      return 'No required guided fields are missing. Use the Check button to review documents and consistency issues.';
    }
    return `You still need ${missing.length} required answer${missing.length === 1 ? '' : 's'}. Next missing field: ${missing[0].plainLanguageLabel ?? missing[0].label}.`;
  }

  return 'I can answer questions about a specific field, section, document proof, whether something can be left blank, or what is still missing.';
}

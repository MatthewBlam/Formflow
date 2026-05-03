import type { FormField, FormFlowState, FormSchema } from '@/types';
import { getAllFields, getFieldById, getSectionForField } from './modes';

type AssistantLanguage = FormFlowState['language'];

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
  'documento',
  'documentos',
  'prueba',
  'comprobante',
  'papeles',
  'identificacion',
  'identificación',
];
const BLANK_TERMS = ['blank', 'skip', 'leave empty', 'required', 'optional', 'blanco', 'saltar', 'requerido', 'opcional'];
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
  'beneficio',
  'beneficios',
  'programa',
  'programas',
  'estampillas',
  'comida',
  'dinero',
  'ayuda',
];
const OPTION_TERMS = ['option', 'options', 'choice', 'choices', 'available', 'select', 'choose', 'opcion', 'opciones', 'escoger', 'elegir'];
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
  'line',
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
  'under',
  'campo',
  'campos',
  'pregunta',
  'preguntas',
  'pagina',
  'página',
  'actual',
  'necesito',
  'necesita',
  'quiero',
  'cual',
  'cuál',
  'que',
  'qué',
  'por',
  'para',
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
type SpatialRelation = 'above' | 'below' | 'left-of' | 'right-of';

const FIELD_LABEL_ES: Record<string, string> = {
  programs_requested: 'Que beneficios quiere solicitar?',
  expedited_food: 'Necesita ayuda de comida de inmediato?',
  applicant_name: 'Cual es su nombre legal completo?',
  date_of_birth: 'Cual es su fecha de nacimiento?',
  ssn: 'Cual es su numero de Seguro Social, si tiene uno?',
  phone: 'Que numero de telefono puede usar el condado para comunicarse con usted?',
  home_address: 'Donde vive ahora?',
  city_state_zip: 'Cual es la ciudad, estado y codigo postal de esa direccion?',
  mailing_address: 'Debe enviarse el correo a otro lugar?',
  household_size: 'Cuantas personas viven en su hogar?',
  household_members: 'Quien vive con usted?',
  marital_status: 'Cual es su estado civil?',
  employment_status: 'Esta trabajando ahora?',
  employer_name: 'Para quien trabaja?',
  monthly_income: 'Cuanto dinero gana del trabajo cada mes antes de impuestos?',
  other_income: 'Recibe dinero de otra fuente?',
  rent_amount: 'Cuanto paga de renta o hipoteca cada mes?',
  utilities: 'Paga servicios como gas, electricidad, agua o telefono?',
  signature: 'Firmo la solicitud?',
  signature_date: 'Que fecha puso al firmar?',
};

const SECTION_ES: Record<string, string> = {
  'Programs you want': 'Programas que quiere',
  'Basic information': 'Informacion basica',
  Address: 'Direccion',
  Household: 'Hogar',
  'Income and work': 'Ingresos y trabajo',
  Expenses: 'Gastos',
  Signature: 'Firma',
};

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

function languageOf(state: Pick<FormFlowState, 'language'> | { language?: AssistantLanguage }) {
  return state.language === 'es' ? 'es' : 'en';
}

export function fieldDisplayName(field: FormField, language: AssistantLanguage = 'en') {
  if (language === 'es') return FIELD_LABEL_ES[field.id] ?? field.plainLanguageLabel ?? field.label;
  return field.plainLanguageLabel ?? field.label;
}

function sectionDisplayName(sectionTitle: string | undefined, language: AssistantLanguage) {
  if (!sectionTitle) return language === 'es' ? 'Seccion desconocida' : 'Unknown section';
  return language === 'es' ? SECTION_ES[sectionTitle] ?? sectionTitle : sectionTitle;
}

function normalizeSpanishAliases(value: string) {
  return value
    .toLowerCase()
    .replace(/\bpor qu[eé]\b/g, ' why ')
    .replace(/\bqu[eé]\b/g, ' what ')
    .replace(/\bd[óo]nde\b/g, ' where ')
    .replace(/\bc[óo]mo\b/g, ' how ')
    .replace(/\bformulario\b/g, ' form ')
    .replace(/\bp[áa]gina\b/g, ' page ')
    .replace(/\bactual\b/g, ' current ')
    .replace(/\bbeneficios?\b|\bprogramas?\b|\bcomida\b|\bdinero\b|\bayuda\b/g, ' benefits programs ')
    .replace(/\bdocumentos?\b|\bpruebas?\b|\bcomprobantes?\b|\bpapeles\b|\bidentificaci[óo]n\b/g, ' documents proof ')
    .replace(/\bnombre\b/g, ' name ')
    .replace(/\bnacimiento\b|\bfecha de nacimiento\b/g, ' birth date ')
    .replace(/\btel[ée]fono\b|\bcelular\b/g, ' phone ')
    .replace(/\bdirecci[óo]n\b|\bdonde vivo\b/g, ' address ')
    .replace(/\bciudad\b|\bestado\b|\bcodigo postal\b|\bc[óo]digo postal\b/g, ' city zip ')
    .replace(/\bingresos?\b|\bsueldo\b|\bsalario\b|\btrabajo\b|\btrabaja\b/g, ' income work money ')
    .replace(/\bhogar\b|\bfamilia\b|\bpersonas\b|\bhijos\b|\bni[ñn]os\b/g, ' household family ')
    .replace(/\brenta\b|\balquiler\b|\bhipoteca\b/g, ' rent mortgage ')
    .replace(/\bfirma\b|\bfirm[éeo]\b/g, ' signature ')
    .replace(/\barriba\b/g, ' top ')
    .replace(/\babajo\b/g, ' bottom below ')
    .replace(/\bizquierda\b/g, ' left ')
    .replace(/\bderecha\b/g, ' right ')
    .replace(/\bdebajo\b/g, ' under below ')
    .replace(/\bencima\b/g, ' above ');
}

export function inferRelatedQuestion(input: string) {
  const normalized = normalizeSpanishAliases(input);

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
  return normalizeSpanishAliases(value)
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
  const normalized = normalizeSpanishAliases(input);
  const explicit = normalized.match(
    /\bpage\s+(?:number\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/
  );
  if (explicit) {
    const numericPage = Number(explicit[1]);
    return Number.isFinite(numericPage) ? numericPage : PAGE_WORDS[explicit[1]];
  }

  if (
    currentPage &&
    /\b(this page|current page|same page|the page i'?m on|page i'?m on|on this page|on the current page)\b/i.test(normalized)
  ) {
    return currentPage;
  }

  return null;
}

export function fieldsForPage(schema: FormSchema, page: number) {
  return getAllFields(schema).filter((field) => field.page === page);
}

function locationFilteredFields(fields: FormField[], input: string) {
  const normalized = normalizeSpanishAliases(input);
  let candidates = fields;

  if (/\btop\b/.test(normalized)) {
    candidates = candidates.filter((field) => field.bbox.y < 0.4);
  }
  if (/\bbottom\b/.test(normalized)) {
    candidates = candidates.filter((field) => field.bbox.y > 0.55);
  }
  if (/\bleft\b/.test(normalized)) {
    candidates = candidates.filter((field) => field.bbox.x < 0.45);
  }
  if (/\bright\b/.test(normalized)) {
    candidates = candidates.filter((field) => field.bbox.x > 0.4);
  }

  return candidates;
}

function relationFromInput(input: string): SpatialRelation | null {
  const normalized = normalizeSpanishAliases(input);
  if (/\b(under|below|beneath|after)\b/i.test(normalized)) return 'below';
  if (/\b(above|over|before)\b/i.test(normalized)) return 'above';
  if (/\b(left of|to the left of)\b/i.test(normalized)) return 'left-of';
  if (/\b(right of|to the right of)\b/i.test(normalized)) return 'right-of';
  return null;
}

function fieldDistance(a: FormField, b: FormField) {
  const ax = a.bbox.x + a.bbox.width / 2;
  const ay = a.bbox.y + a.bbox.height / 2;
  const bx = b.bbox.x + b.bbox.width / 2;
  const by = b.bbox.y + b.bbox.height / 2;
  return Math.hypot(ax - bx, ay - by);
}

export function fieldByVisualReference(schema: FormSchema, input: string, currentPage?: number) {
  const referencedPage = extractPageReference(input, currentPage);
  const allFields = getAllFields(schema);
  const pageScopedFields = referencedPage ? fieldsForPage(schema, referencedPage) : allFields;
  const relation = relationFromInput(input);

  if (relation) {
    const anchor = bestMatchingField(allFields, input);
    if (anchor) {
      const related = allFields
        .filter((field) => field.id !== anchor.id && field.page === anchor.page)
        .filter((field) => {
          if (relation === 'below') return field.bbox.y > anchor.bbox.y;
          if (relation === 'above') return field.bbox.y < anchor.bbox.y;
          if (relation === 'left-of') return field.bbox.x < anchor.bbox.x;
          return field.bbox.x > anchor.bbox.x;
        })
        .sort((a, b) => fieldDistance(a, anchor) - fieldDistance(b, anchor));
      return related[0] ?? anchor;
    }
  }

  const locatedFields = locationFilteredFields(pageScopedFields, input);
  if (locatedFields.length !== pageScopedFields.length) {
    return (
      bestMatchingField(locatedFields, input) ??
      locatedFields.sort((a, b) => {
        const normalized = normalizeSpanishAliases(input);
        if (/\btop\b/.test(normalized) && Math.abs(a.bbox.y - b.bbox.y) > 0.01) return a.bbox.y - b.bbox.y;
        if (/\bbottom\b/.test(normalized) && Math.abs(a.bbox.y - b.bbox.y) > 0.01) return b.bbox.y - a.bbox.y;
        if (/\bright\b/.test(normalized) && Math.abs(a.bbox.x - b.bbox.x) > 0.01) return b.bbox.x - a.bbox.x;
        if (/\bleft\b/.test(normalized) && Math.abs(a.bbox.x - b.bbox.x) > 0.01) return a.bbox.x - b.bbox.x;
        return 0;
      })[0] ??
      null
    );
  }

  return null;
}

function programField(fields: ReturnType<typeof getAllFields>) {
  return (
    fields.find((field) => field.id === 'programs_requested') ??
    fields.find((field) => /benefits|programs|apply/i.test(`${field.label} ${field.plainLanguageLabel ?? ''}`)) ??
    null
  );
}

export function answerFieldContext(
  state: Pick<FormFlowState, 'formSchema' | 'applicationProfile'> & Partial<Pick<FormFlowState, 'language'>>,
  fieldId: string
) {
  const field = getFieldById(state.formSchema, fieldId);
  if (!field) return null;
  const language = languageOf(state);
  const section = getSectionForField(state.formSchema, field.id);
  const entry = state.applicationProfile[field.id];
  const options = field.options?.length
    ? language === 'es'
      ? ` Opciones en este formulario: ${field.options.join(', ')}.`
      : ` Options on this form: ${field.options.join(', ')}.`
    : '';

  if (language === 'es') {
    return `${fieldDisplayName(field, language)}: Esto ayuda al condado a revisar su solicitud.${options} Seccion relacionada: ${sectionDisplayName(section?.title, language)}.${entry?.value ? ` Respuesta actual: ${entry.value}.` : ' Todavia no hay una respuesta guardada.'}`;
  }

  return `${fieldDisplayName(field, language)}: ${field.whyAsking ?? 'This helps the county review your application.'}${options} Related section: ${sectionDisplayName(section?.title, language)}.${entry?.value ? ` Current answer: ${entry.value}.` : ' No answer is saved yet.'}`;
}

function summarizePage(schema: FormSchema, page: number, language: AssistantLanguage) {
  const pageFields = fieldsForPage(schema, page);
  if (pageFields.length === 0) {
    if (language === 'es') {
      return `No tengo contexto de campos guiados para la pagina ${page}. Puede preguntar sobre una etiqueta que vea ahi, o moverse a una pagina con campos guiados y preguntar sobre esa pagina.`;
    }
    return `I do not have guided field context indexed for page ${page}. You can still ask about a label you see there, or move to a page with guided fields and ask about that page.`;
  }

  const sectionTitles = Array.from(
    new Set(
      pageFields
        .map((field) => getSectionForField(schema, field.id)?.title)
        .filter(Boolean)
    )
  );
  const fieldLabels = pageFields.map((field) => fieldDisplayName(field, language)).join(', ');
  if (language === 'es') {
    return `En la pagina ${page}, mi contexto guiado incluye ${pageFields.length} campo${pageFields.length === 1 ? '' : 's'}${sectionTitles.length ? ` en ${sectionTitles.map((title) => sectionDisplayName(title, language)).join(', ')}` : ''}: ${fieldLabels}.`;
  }
  return `On page ${page}, my guided context includes ${pageFields.length} field${pageFields.length === 1 ? '' : 's'}${sectionTitles.length ? ` in ${sectionTitles.join(', ')}` : ''}: ${fieldLabels}.`;
}

export function answerQuestion(
  state: Pick<FormFlowState, 'formSchema' | 'applicationProfile' | 'documentStatusMap' | 'currentFieldId' | 'currentPage' | 'language'>,
  question: string
) {
  const schema = state.formSchema;
  const language = languageOf(state);
  if (!schema) {
    if (language === 'es') {
      return 'Primero cargue un formulario. Luego puedo contestar preguntas sobre campos, documentos y lo que falta.';
    }
    return 'Load a form first, then I can answer questions about fields, documents, and what is still missing.';
  }

  const normalized = normalizeSpanishAliases(question);
  const fields = getAllFields(schema);
  const referencedPage = extractPageReference(question, state.currentPage);
  const scopedFields = referencedPage ? fieldsForPage(schema, referencedPage) : fields;
  const visualField = fieldByVisualReference(schema, question, state.currentPage);

  if (visualField && /\b(field|box|line|top|bottom|left|right|under|below|above|over)\b/i.test(normalized)) {
    return answerFieldContext(state, visualField.id)!;
  }

  if (includesAny(normalized, PROGRAM_TERMS)) {
    const field = programField(fields);
    const options = field?.options ?? [];
    if (options.length > 0) {
      if (language === 'es') {
        return `Este formulario puede pedir que el condado revise estos programas de beneficios: ${options.join(', ')}. No puedo decirle con seguridad para cuales califica, pero puede escoger los programas que quiere que el condado revise.`;
      }
      return `This form can be used to ask the county to look at these benefit programs: ${options.join(', ')}. I cannot tell you for sure which ones you qualify for, but you can choose the programs you want the county to evaluate. If you are not sure, it is usually okay to select the programs you want help with and let the county review eligibility.`;
    }
    if (language === 'es') {
      return 'Este formulario sirve para pedir que el condado revise programas de beneficios. Puedo ayudarle a identificar las opciones, pero no puedo garantizar elegibilidad.';
    }
    return 'This form is for asking the county to review benefit programs. I can help identify the program choices shown on the form, but I cannot guarantee eligibility.';
  }

  if (normalized.includes('what form') || normalized.includes('what is this form') || normalized.includes('what does this form')) {
    const sections = schema.sections.map((section) => section.title).join(', ');
    if (language === 'es') {
      return `${schema.title} es un paquete de solicitud de beneficios. El contexto guiado que tengo incluye estas secciones: ${schema.sections.map((section) => sectionDisplayName(section.title, language)).join(', ')}. Puedo explicar una seccion o ayudarle a contestar los campos paso a paso.`;
    }
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
      return summarizePage(schema, referencedPage, language);
    }
  }

  if (normalized.includes('section') || normalized.includes('fields') || normalized.includes('questions on')) {
    if (language === 'es') {
      return `Veo ${schema.sections.length} secciones principales en este contexto guiado: ${schema.sections
        .map((section) => sectionDisplayName(section.title, language))
        .join(', ')}.`;
    }
    return `I see ${schema.sections.length} main sections in this guided form context: ${schema.sections
      .map((section) => section.title)
      .join(', ')}.`;
  }

  if (referencedPage && scopedFields.length === 0) {
    return summarizePage(schema, referencedPage, language);
  }

  if (includesAny(normalized, DOCUMENT_TERMS)) {
    const docs = schema.documentRequirements ?? [];
    const needed = docs.filter((doc) => state.documentStatusMap[doc.id] !== 'present');
    if (needed.length === 0) {
      if (language === 'es') {
        return 'Todos los documentos listados estan marcados como presentes. Aun debe traer los originales o copias que el condado pida.';
      }
      return 'All listed documents are marked present. You should still bring the originals or copies that the county asks for.';
    }
    if (language === 'es') {
      return `Todavia tiene ${needed.length} documento${needed.length === 1 ? '' : 's'} marcado${needed.length === 1 ? '' : 's'} como necesario${needed.length === 1 ? '' : 's'}: ${needed
        .map((doc) => doc.title)
        .join(', ')}.`;
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
      if (language === 'es') {
        return `${fieldDisplayName(matchingField, language)} es ${matchingField.required ? 'requerido para este paquete guiado' : 'opcional o depende de su situacion'}. ${matchingField.required ? 'Si no lo sabe, marquelo para revisar en vez de adivinar.' : 'Puede dejarlo en blanco si no aplica.'}`;
      }
      return `${matchingField.plainLanguageLabel ?? matchingField.label} is ${matchingField.required ? 'required for this guided packet' : 'optional or situation-dependent'}. ${matchingField.required ? 'If you do not know it, mark it for review instead of guessing.' : 'You can leave it blank if it does not apply.'}`;
    }
    const wantsOptions = includesAny(normalized, OPTION_TERMS);
    if (wantsOptions && matchingField.options?.length) {
      if (language === 'es') {
        return `Para "${fieldDisplayName(matchingField, language)}", las opciones en este contexto guiado son: ${matchingField.options.join(', ')}.`;
      }
      return `For "${matchingField.plainLanguageLabel ?? matchingField.label}", the options shown in this guided form context are: ${matchingField.options.join(', ')}.`;
    }
    return answerFieldContext(state, matchingField.id)!;
  }

  if (referencedPage) {
    return summarizePage(schema, referencedPage, language);
  }

  if (normalized.includes('progress') || normalized.includes('missing')) {
    const missing = fields.filter((field) => field.required && !state.applicationProfile[field.id]?.value.trim());
    if (missing.length === 0) {
      if (language === 'es') {
        return 'No faltan campos guiados requeridos. Use el boton de revisar para revisar documentos y posibles inconsistencias.';
      }
      return 'No required guided fields are missing. Use the Check button to review documents and consistency issues.';
    }
    if (language === 'es') {
      return `Todavia necesita ${missing.length} respuesta${missing.length === 1 ? '' : 's'} requerida${missing.length === 1 ? '' : 's'}. Siguiente campo faltante: ${fieldDisplayName(missing[0], language)}.`;
    }
    return `You still need ${missing.length} required answer${missing.length === 1 ? '' : 's'}. Next missing field: ${missing[0].plainLanguageLabel ?? missing[0].label}.`;
  }

  if (language === 'es') {
    return 'Puedo contestar preguntas sobre un campo especifico, una seccion, documentos de prueba, si algo se puede dejar en blanco, o lo que todavia falta.';
  }
  return 'I can answer questions about a specific field, section, document proof, whether something can be left blank, or what is still missing.';
}

import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { pathToFileURL } from 'url';
import OpenAI from 'openai';
import type { FormField, FormSchema, UploadKind } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const OPENAI_EXTRACT_MODEL = process.env.OPENAI_EXTRACT_MODEL ?? 'gpt-4.1-mini';
const MAX_VISION_PAGES = Number(process.env.FORMFLOW_MAX_VISION_PAGES ?? 3);
const MAX_CANDIDATES_PER_PAGE = 70;

const FORM_SCHEMA_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          fields: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                plainLanguageLabel: { type: 'string' },
                type: { enum: ['text', 'date', 'number', 'checkbox', 'select'] },
                required: { type: 'boolean' },
                page: { type: 'number' },
                bbox: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    page: { type: 'number' },
                    x: { type: 'number', minimum: 0, maximum: 1 },
                    y: { type: 'number', minimum: 0, maximum: 1 },
                    width: { type: 'number', minimum: 0, maximum: 1 },
                    height: { type: 'number', minimum: 0, maximum: 1 },
                  },
                  required: ['page', 'x', 'y', 'width', 'height'],
                },
                whyAsking: { type: 'string' },
                exampleAnswer: { type: 'string' },
                options: { type: 'array', items: { type: 'string' } },
              },
              required: ['id', 'label', 'type', 'required', 'page', 'bbox'],
            },
          },
        },
        required: ['id', 'title', 'fields'],
      },
    },
    documentRequirements: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          plainExplanation: { type: 'string' },
          examples: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'title', 'plainExplanation', 'examples'],
      },
    },
  },
  required: ['id', 'title', 'sections'],
} as const;

const SYSTEM_PROMPT = `You are an expert at analyzing government benefit application forms. When given a PDF form, you extract every visible form field and return a structured JSON schema.

Return ONLY valid JSON matching this exact TypeScript type (no markdown, no explanation):

{
  id: string,
  title: string,
  sections: Array<{
    id: string,
    title: string,
    fields: Array<{
      id: string,            // snake_case unique identifier
      label: string,         // exact label text from the form
      plainLanguageLabel?: string,  // plain English rewrite of the label
      type: "text" | "date" | "number" | "checkbox" | "select",
      required: boolean,
      page: number,          // 1-indexed page number
      bbox: {
        page: number,
        x: number,    // left edge as fraction of page width (0-1)
        y: number,    // top edge as fraction of page height (0-1)
        width: number,
        height: number
      },
      whyAsking?: string,    // plain language explanation of why this field is needed
      exampleAnswer?: string,
      options?: string[]     // for select/checkbox fields
    }>
  }>,
  documentRequirements?: Array<{
    id: string,
    title: string,
    plainExplanation: string,
    examples: string[]
  }>
}

Guidelines:
- Group related fields into logical sections (e.g. "Personal Information", "Address", "Household Members")
- Estimate bounding boxes as fractions of page dimensions based on visual position
- Scan every page of the PDF. Do not stop after the first pages with fields.
- For government forms, mark name/address/DOB fields as required=true
- Write whyAsking in simple, empathetic language a first-time applicant would understand
- Identify common supporting documents needed (proof of ID, residency, income, etc.)`;

const PAGE_VISION_PROMPT = `You are helping elderly and non-native English-speaking users complete a government form.

You will receive:
1. A rendered image of one PDF page.
2. A JSON list of visually detected candidate controls with normalized bounding boxes.

Identify actual user-fillable fields on this page. Prefer the candidate boxes because they were detected from page geometry. You may slightly adjust a bbox only if the image clearly shows the candidate is offset. If an important visible field is missing from the candidates, add it with your best normalized bbox from the page image.

Return only fields that the user can answer: blanks, checkboxes, yes/no options, table entry cells, date/signature lines, and program choices. Ignore instructions, examples, section headings, page numbers, and decorative boxes.

Write labels and explanations in simple language for a first-time applicant.`;

const PAGE_FIELD_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    fields: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          candidateId: { type: 'string' },
          id: { type: 'string' },
          label: { type: 'string' },
          plainLanguageLabel: { type: 'string' },
          type: { enum: ['text', 'date', 'number', 'checkbox', 'select'] },
          required: { type: 'boolean' },
          bbox: {
            type: 'object',
            additionalProperties: false,
            properties: {
              page: { type: 'number' },
              x: { type: 'number', minimum: 0, maximum: 1 },
              y: { type: 'number', minimum: 0, maximum: 1 },
              width: { type: 'number', minimum: 0, maximum: 1 },
              height: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['page', 'x', 'y', 'width', 'height'],
          },
          whyAsking: { type: 'string' },
          exampleAnswer: { type: 'string' },
          options: { type: 'array', items: { type: 'string' } },
          sectionTitle: { type: 'string' },
        },
        required: [
          'candidateId',
          'id',
          'label',
          'plainLanguageLabel',
          'type',
          'required',
          'bbox',
          'whyAsking',
          'exampleAnswer',
          'options',
          'sectionTitle',
        ],
      },
    },
  },
  required: ['fields'],
} as const;

interface PdfTextItem {
  page: number;
  pageWidth: number;
  pageHeight: number;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PageInfo {
  page: number;
  width: number;
  height: number;
}

interface FieldCandidate {
  id: string;
  page: number;
  labelHint: string;
  typeHint: 'text' | 'checkbox' | 'select';
  bbox: FormField['bbox'];
}

interface PageDetection {
  page: number;
  width: number;
  height: number;
  imageBase64: string;
  candidates: FieldCandidate[];
}

interface UploadClassification {
  uploadKind: UploadKind;
  uploadKindConfidence: number;
}

interface PageFieldResult {
  candidateId: string;
  id: string;
  label: string;
  plainLanguageLabel: string;
  type: FormField['type'];
  required: boolean;
  bbox: FormField['bbox'];
  whyAsking: string;
  exampleAnswer: string;
  options: string[];
  sectionTitle: string;
}

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

function configurePdfJsForNode(pdfjs: PdfJsModule) {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')
  ).href;
}

function loadPdfDocument(pdfjs: PdfJsModule, pdfBase64: string) {
  const data = new Uint8Array(Buffer.from(pdfBase64, 'base64'));
  const params = {
    data,
    disableWorker: true,
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  };
  return pdfjs.getDocument(params as Parameters<PdfJsModule['getDocument']>[0]).promise;
}

const STOP_WORDS = new Set([
  'and',
  'are',
  'for',
  'from',
  'have',
  'one',
  'the',
  'this',
  'what',
  'with',
  'you',
  'your',
]);

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function words(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function scoreLabelMatch(field: FormField, item: PdfTextItem) {
  const fieldWords = words(`${field.label} ${field.plainLanguageLabel ?? ''}`);
  if (fieldWords.length === 0) return 0;

  const itemWords = new Set(words(item.text));
  const matches = fieldWords.filter((word) => itemWords.has(word)).length;
  return matches / fieldWords.length;
}

function findBestLabelItem(field: FormField, pageItems: PdfTextItem[]) {
  const currentCenter = {
    x: (field.bbox.x + field.bbox.width / 2) * (pageItems[0]?.pageWidth ?? 1),
    y: (field.bbox.y + field.bbox.height / 2) * (pageItems[0]?.pageHeight ?? 1),
  };

  return pageItems
    .map((item) => {
      const match = scoreLabelMatch(field, item);
      const distance = Math.hypot(item.x - currentCenter.x, item.y - currentCenter.y);
      const distancePenalty = Math.min(distance / 1000, 0.3);
      return { item, score: match - distancePenalty };
    })
    .filter(({ score }) => score >= 0.35)
    .sort((a, b) => b.score - a.score)[0]?.item;
}

function normalizedBox(
  page: number,
  pageWidth: number,
  pageHeight: number,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const left = clamp(x, 0, pageWidth - 4);
  const top = clamp(y, 0, pageHeight - 4);
  const safeWidth = clamp(width, 8, pageWidth - left);
  const safeHeight = clamp(height, 8, pageHeight - top);

  return {
    page,
    x: left / pageWidth,
    y: top / pageHeight,
    width: safeWidth / pageWidth,
    height: safeHeight / pageHeight,
  };
}

function estimateTextBox(field: FormField, labelItem: PdfTextItem, pageItems: PdfTextItem[]) {
  const sameRowItems = pageItems
    .filter((item) => Math.abs(item.y - labelItem.y) <= 4 && item.x > labelItem.x + labelItem.width + 8)
    .sort((a, b) => a.x - b.x);
  const nextColumnX = sameRowItems[0]?.x;

  const nextRows = pageItems
    .filter((item) => item.y > labelItem.y + labelItem.height + 4)
    .map((item) => item.y)
    .sort((a, b) => a - b);

  const x = labelItem.x;
  const y = labelItem.y + labelItem.height + 2;
  const width = nextColumnX ? nextColumnX - x - 6 : labelItem.pageWidth - x - 36;
  const nextRowY = nextRows.find((rowY) => rowY > y + 8);
  const height = nextRowY ? Math.min(Math.max(nextRowY - y - 3, 12), 30) : 22;

  return normalizedBox(field.page, labelItem.pageWidth, labelItem.pageHeight, x, y, width, height);
}

function estimateCheckboxBox(field: FormField, labelItem: PdfTextItem, pageItems: PdfTextItem[]) {
  const squares = pageItems
    .filter(
      (item) =>
        item.text === '■' &&
        item.y >= labelItem.y - 4 &&
        item.y <= labelItem.y + 52 &&
        item.x >= labelItem.x - 4
    )
    .filter((item, index, all) => index === all.findIndex((other) => Math.abs(other.x - item.x) < 2 && Math.abs(other.y - item.y) < 2))
    .sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));

  if (squares.length === 0) {
    return estimateTextBox(field, labelItem, pageItems);
  }

  const left = Math.max(0, squares[0].x - 3);
  const top = Math.max(0, Math.min(...squares.map((square) => square.y)) - 3);
  const right = Math.min(labelItem.pageWidth, Math.max(...squares.map((square) => square.x + square.width)) + 42);
  const bottom = Math.min(labelItem.pageHeight, Math.max(...squares.map((square) => square.y + square.height)) + 3);

  return normalizedBox(field.page, labelItem.pageWidth, labelItem.pageHeight, left, top, right - left, bottom - top);
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 48) || 'field'
  );
}

function getNearbyLabel(pageItems: PdfTextItem[], page: number, x: number, y: number) {
  const sameLine = pageItems
    .filter((item) => item.page === page && Math.abs(item.y - y) <= 4 && item.x < x && item.text !== '■')
    .sort((a, b) => a.x - b.x)
    .map((item) => item.text)
    .join(' ')
    .trim();

  if (sameLine.length > 8) return sameLine;

  return (
    pageItems
      .filter((item) => item.page === page && item.y < y && y - item.y < 28 && item.text !== '■')
      .sort((a, b) => b.y - a.y || a.x - b.x)
      .slice(0, 3)
      .map((item) => item.text)
      .join(' ')
      .trim() || `Field on page ${page}`
  );
}

function isInstructionLike(text: string) {
  const lower = text.toLowerCase();
  return (
    lower.startsWith('please ') ||
    lower.startsWith('if ') ||
    lower.startsWith('note:') ||
    lower.startsWith('examples ') ||
    lower.includes('attach additional sheets') ||
    lower.includes('skip to') ||
    lower.includes('complete the following') ||
    lower === 'yes' ||
    lower === 'no' ||
    lower.length < 3
  );
}

function looksLikeFieldLabel(item: PdfTextItem) {
  if (item.text === '■' || /_{5,}/.test(item.text) || isInstructionLike(item.text)) return false;
  if (item.text.length > 130) return false;

  const letters = item.text.replace(/[^A-Za-z]/g, '');
  const uppercase = item.text.replace(/[^A-Z]/g, '');
  const uppercaseRatio = letters.length ? uppercase.length / letters.length : 0;

  return item.text.includes('?') || uppercaseRatio > 0.65 || /^(name|address|city|state|county|zip|date|signature|phone|email)\b/i.test(item.text);
}

function candidateFromFieldLikeLabel(pageItems: PdfTextItem[], item: PdfTextItem, index: number): FieldCandidate {
  const page = item.page;
  const squares = pageItems
    .filter((candidate) => candidate.text === '■' && Math.abs(candidate.y - item.y) <= 8 && candidate.x > item.x + item.width)
    .sort((a, b) => a.x - b.x);

  if (item.text.includes('?') && squares.length > 0) {
    const first = squares[0];
    const last = squares[squares.length - 1];
    return {
      id: `candidate_checkbox_p${page}_${index}_${slugify(item.text)}`,
      page,
      labelHint: item.text,
      typeHint: 'checkbox',
      bbox: normalizedBox(page, item.pageWidth, item.pageHeight, first.x - 3, first.y - 3, last.x + last.width + 42 - first.x, 18),
    };
  }

  const fakeField: FormField = {
    id: `candidate_text_p${page}_${index}`,
    label: item.text,
    plainLanguageLabel: item.text,
    type: 'text',
    required: false,
    page,
    bbox: normalizedBox(page, item.pageWidth, item.pageHeight, item.x, item.y, Math.max(item.width, 40), Math.max(item.height, 12)),
  };

  return {
    id: `candidate_text_p${page}_${index}_${slugify(item.text)}`,
    page,
    labelHint: item.text,
    typeHint: 'text',
    bbox: estimateTextBox(fakeField, item, pageItems),
  };
}

function overlapsExisting(candidate: FormField, existingFields: FormField[]) {
  return existingFields.some((field) => {
    if (field.page !== candidate.page) return false;

    const left = Math.max(field.bbox.x, candidate.bbox.x);
    const top = Math.max(field.bbox.y, candidate.bbox.y);
    const right = Math.min(field.bbox.x + field.bbox.width, candidate.bbox.x + candidate.bbox.width);
    const bottom = Math.min(field.bbox.y + field.bbox.height, candidate.bbox.y + candidate.bbox.height);
    const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
    const candidateArea = candidate.bbox.width * candidate.bbox.height;

    return candidateArea > 0 && intersection / candidateArea > 0.25;
  });
}

function overlapsCandidate(candidate: FieldCandidate, existingCandidates: FieldCandidate[]) {
  return existingCandidates.some((field) => {
    if (field.page !== candidate.page) return false;

    const left = Math.max(field.bbox.x, candidate.bbox.x);
    const top = Math.max(field.bbox.y, candidate.bbox.y);
    const right = Math.min(field.bbox.x + field.bbox.width, candidate.bbox.x + candidate.bbox.width);
    const bottom = Math.min(field.bbox.y + field.bbox.height, candidate.bbox.y + candidate.bbox.height);
    const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
    const candidateArea = candidate.bbox.width * candidate.bbox.height;

    return candidateArea > 0 && intersection / candidateArea > 0.35;
  });
}

function buildFieldCandidatesForPage(pageItems: PdfTextItem[], pageInfo: PageInfo): FieldCandidate[] {
  const pageItemsForPage = pageItems.filter((item) => item.page === pageInfo.page);
  const candidates: FieldCandidate[] = [];

  const squares = pageItemsForPage
    .filter((item) => item.text === '■')
    .filter((item, index, all) => index === all.findIndex((other) => Math.abs(other.x - item.x) < 2 && Math.abs(other.y - item.y) < 2))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  const squareRows: PdfTextItem[][] = [];
  for (const square of squares) {
    const row = squareRows.find((items) => Math.abs(items[0].y - square.y) <= 4);
    if (row) row.push(square);
    else squareRows.push([square]);
  }

  for (const [index, row] of squareRows.entries()) {
    const sortedRow = row.sort((a, b) => a.x - b.x);
    const first = sortedRow[0];
    const last = sortedRow[sortedRow.length - 1];
    const label = getNearbyLabel(pageItemsForPage, pageInfo.page, first.x, first.y);
    const candidate: FieldCandidate = {
      id: `candidate_checkbox_p${pageInfo.page}_${index}_${slugify(label)}`,
      page: pageInfo.page,
      labelHint: label,
      typeHint: 'checkbox',
      bbox: normalizedBox(pageInfo.page, pageInfo.width, pageInfo.height, first.x - 3, first.y - 3, last.x + last.width + 42 - first.x, 18),
    };
    if (!overlapsCandidate(candidate, candidates)) candidates.push(candidate);
  }

  const blankItems = pageItemsForPage.filter((item) => /_{5,}/.test(item.text));
  for (const [index, item] of blankItems.entries()) {
    const match = item.text.match(/_{5,}/);
    if (!match || match.index === undefined) continue;

    const charWidth = item.width / Math.max(item.text.length, 1);
    const x = item.x + match.index * charWidth;
    const width = Math.max(match[0].length * charWidth, 40);
    const labelText = item.text.slice(0, match.index).trim() || getNearbyLabel(pageItemsForPage, pageInfo.page, x, item.y);
    const candidate: FieldCandidate = {
      id: `candidate_text_p${pageInfo.page}_${index}_${slugify(labelText)}`,
      page: pageInfo.page,
      labelHint: labelText,
      typeHint: 'text',
      bbox: normalizedBox(pageInfo.page, pageInfo.width, pageInfo.height, x, item.y - 2, width, Math.max(item.height + 6, 14)),
    };
    if (!overlapsCandidate(candidate, candidates)) candidates.push(candidate);
  }

  const labelItems = pageItemsForPage.filter(looksLikeFieldLabel);
  for (const [index, item] of labelItems.entries()) {
    const candidate = candidateFromFieldLikeLabel(pageItemsForPage, item, index);
    if (!overlapsCandidate(candidate, candidates)) candidates.push(candidate);
  }

  return candidates
    .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
    .slice(0, MAX_CANDIDATES_PER_PAGE);
}

function buildDetectedFields(pdfItems: PdfTextItem[], schema: FormSchema): FormField[] {
  const existingFields = schema.sections.flatMap((section) => section.fields);
  const detected: FormField[] = [];
  const pages = [...new Set(pdfItems.map((item) => item.page))];

  for (const page of pages) {
    const pageItems = pdfItems.filter((item) => item.page === page);
    const existingOnPage = existingFields.filter((field) => field.page === page);
    const pageCandidates: FormField[] = [];

    const squares = pageItems
      .filter((item) => item.text === '■')
      .filter((item, index, all) => index === all.findIndex((other) => Math.abs(other.x - item.x) < 2 && Math.abs(other.y - item.y) < 2))
      .sort((a, b) => a.y - b.y || a.x - b.x);

    const squareRows: PdfTextItem[][] = [];
    for (const square of squares) {
      const row = squareRows.find((items) => Math.abs(items[0].y - square.y) <= 4);
      if (row) row.push(square);
      else squareRows.push([square]);
    }

    for (const [index, row] of squareRows.entries()) {
      const sortedRow = row.sort((a, b) => a.x - b.x);
      const first = sortedRow[0];
      const last = sortedRow[sortedRow.length - 1];
      const label = getNearbyLabel(pageItems, page, first.x, first.y);
      const bbox = normalizedBox(page, first.pageWidth, first.pageHeight, first.x - 3, first.y - 3, last.x + last.width + 42 - first.x, 18);
      pageCandidates.push({
        id: `detected_checkbox_p${page}_${index}_${slugify(label)}`,
        label,
        plainLanguageLabel: label,
        type: 'checkbox',
        required: false,
        page,
        bbox,
        whyAsking: 'This checkbox is printed on the form. Choose the answer that is true for your household, or leave it blank if it does not apply.',
        exampleAnswer: 'Yes or No',
        options: ['Yes', 'No'],
      });
    }

    const blankItems = pageItems.filter((item) => /_{5,}/.test(item.text));
    for (const [index, item] of blankItems.entries()) {
      const match = item.text.match(/_{5,}/);
      if (!match || match.index === undefined) continue;

      const charWidth = item.width / Math.max(item.text.length, 1);
      const x = item.x + match.index * charWidth;
      const width = Math.max(match[0].length * charWidth, 40);
      const labelText = item.text.slice(0, match.index).trim() || getNearbyLabel(pageItems, page, x, item.y);
      const bbox = normalizedBox(page, item.pageWidth, item.pageHeight, x, item.y - 2, width, Math.max(item.height + 6, 14));
      pageCandidates.push({
        id: `detected_text_p${page}_${index}_${slugify(labelText)}`,
        label: labelText,
        plainLanguageLabel: labelText,
        type: 'text',
        required: false,
        page,
        bbox,
        whyAsking: 'This blank line is a place where the form expects a written answer. Fill it in if the question applies to you.',
        exampleAnswer: 'Write the requested name, date, amount, or explanation.',
      });
    }

    const shouldAddPageCandidates = existingOnPage.length < 3;
    if (shouldAddPageCandidates) {
      for (const candidate of pageCandidates.slice(0, 14)) {
        if (!overlapsExisting(candidate, [...existingFields, ...detected])) {
          detected.push(candidate);
        }
      }
    }
  }

  return detected;
}

function augmentSchemaWithDetectedFields(schema: FormSchema, pdfItems: PdfTextItem[]) {
  const detectedFields = buildDetectedFields(pdfItems, schema);
  if (detectedFields.length === 0) return schema;

  return {
    ...schema,
    sections: [
      ...schema.sections,
      {
        id: 'additional_detected_fields',
        title: 'Additional detected fields',
        fields: detectedFields,
      },
    ],
  };
}

function sanitizeBox(field: FormField) {
  return {
    ...field.bbox,
    x: clamp(field.bbox.x, 0, 0.98),
    y: clamp(field.bbox.y, 0, 0.98),
    width: clamp(field.bbox.width, 0.015, 1 - clamp(field.bbox.x, 0, 0.98)),
    height: clamp(field.bbox.height, 0.012, 1 - clamp(field.bbox.y, 0, 0.98)),
  };
}

async function extractPdfTextItems(pdfBase64: string): Promise<PdfTextItem[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  configurePdfJsForNode(pdfjs);
  const document = await loadPdfDocument(pdfjs, pdfBase64);

  const items: PdfTextItem[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      if (!('str' in item) || !('transform' in item) || !item.str.trim()) continue;
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      items.push({
        page: pageNumber,
        pageWidth: viewport.width,
        pageHeight: viewport.height,
        text: item.str.trim().replace(/\s+/g, ' '),
        x,
        y,
        width: item.width,
        height: item.height,
      });
    }
  }

  return items;
}

async function createPageDetections(pdfBase64: string): Promise<PageDetection[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  configurePdfJsForNode(pdfjs);
  const importNativeCanvas = Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<typeof import('@napi-rs/canvas')>;
  const { createCanvas } = await importNativeCanvas('@napi-rs/canvas');
  const document = await loadPdfDocument(pdfjs, pdfBase64);

  const detections: PageDetection[] = [];
  const pageLimit = Math.min(document.numPages, MAX_VISION_PAGES);

  for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const unitViewport = page.getViewport({ scale: 1 });
    const textContent = await page.getTextContent();
    const pageItems: PdfTextItem[] = [];

    for (const item of textContent.items) {
      if (!('str' in item) || !('transform' in item) || !item.str.trim()) continue;
      const [x, y] = unitViewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      pageItems.push({
        page: pageNumber,
        pageWidth: unitViewport.width,
        pageHeight: unitViewport.height,
        text: item.str.trim().replace(/\s+/g, ' '),
        x,
        y,
        width: item.width,
        height: item.height,
      });
    }

    const pageInfo = {
      page: pageNumber,
      width: unitViewport.width,
      height: unitViewport.height,
    };
    const candidates = buildFieldCandidatesForPage(pageItems, pageInfo);
    if (candidates.length === 0) continue;

    const renderViewport = page.getViewport({ scale: 1.5 });
    const canvas = createCanvas(Math.floor(renderViewport.width), Math.floor(renderViewport.height));
    const canvasContext = canvas.getContext('2d');
    await page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: canvasContext as unknown as CanvasRenderingContext2D,
      viewport: renderViewport,
    }).promise;

    detections.push({
      page: pageNumber,
      width: unitViewport.width,
      height: unitViewport.height,
      imageBase64: canvas.toBuffer('image/jpeg', 78).toString('base64'),
      candidates,
    });
  }

  return detections;
}

async function refineFieldBoxes(pdfBase64: string, schema: FormSchema): Promise<FormSchema> {
  try {
    const pdfItems = await extractPdfTextItems(pdfBase64);
    if (pdfItems.length === 0) return schema;
    const augmentedSchema = augmentSchemaWithDetectedFields(schema, pdfItems);

    return {
      ...augmentedSchema,
      sections: augmentedSchema.sections.map((section) => ({
        ...section,
        fields: section.fields.map((field) => {
          if (field.id.startsWith('detected_')) {
            return { ...field, bbox: sanitizeBox(field) };
          }

          const pageItems = pdfItems.filter((item) => item.page === field.page);
          const labelItem = findBestLabelItem(field, pageItems);

          if (!labelItem) {
            return { ...field, bbox: sanitizeBox(field) };
          }

          const bbox =
            field.type === 'checkbox'
              ? estimateCheckboxBox(field, labelItem, pageItems)
              : estimateTextBox(field, labelItem, pageItems);

          return { ...field, page: bbox.page, bbox };
        }),
      })),
    };
  } catch {
    return schema;
  }
}

function sanitizeVisionField(field: PageFieldResult, page: number, candidates: FieldCandidate[]): FormField {
  const candidate = candidates.find((item) => item.id === field.candidateId);
  const rawBox = candidate?.bbox ?? field.bbox;
  const bbox = {
    page,
    x: clamp(rawBox.x, 0, 0.98),
    y: clamp(rawBox.y, 0, 0.98),
    width: clamp(rawBox.width, 0.015, 1 - clamp(rawBox.x, 0, 0.98)),
    height: clamp(rawBox.height, 0.012, 1 - clamp(rawBox.y, 0, 0.98)),
  };

  return {
    id: slugify(field.id || field.label || `page_${page}_field`),
    label: field.label,
    plainLanguageLabel: field.plainLanguageLabel,
    type: field.type,
    required: field.required,
    page,
    bbox,
    whyAsking: field.whyAsking,
    exampleAnswer: field.exampleAnswer,
    options: field.options,
  };
}

function dedupeFields(fields: FormField[]) {
  const result: FormField[] = [];
  for (const field of fields) {
    if (!overlapsExisting(field, result)) {
      result.push(field);
    }
  }
  return result;
}

function deriveDocumentRequirements(fields: FormField[]): FormSchema['documentRequirements'] {
  const labels = fields.map((field) => `${field.id} ${field.label}`.toLowerCase()).join(' ');
  const docs: NonNullable<FormSchema['documentRequirements']> = [];

  if (/(name|birth|date_of_birth|social|identity|ssn)/.test(labels)) {
    docs.push({
      id: 'proof_of_identity',
      title: 'Proof of identity',
      plainExplanation: 'A document that helps the county confirm who you are.',
      examples: ['Driver license', 'State ID', 'Passport', 'Birth certificate'],
    });
  }

  if (/(address|residence|rent|county|zip|homeless)/.test(labels)) {
    docs.push({
      id: 'proof_of_address',
      title: 'Proof of address',
      plainExplanation: 'A document or letter that shows where you live or where you can receive mail.',
      examples: ['Utility bill', 'Rental agreement', 'Shelter letter', 'Mail with your name and address'],
    });
  }

  if (/(income|job|employer|wage|pay|earned|unearned)/.test(labels)) {
    docs.push({
      id: 'proof_of_income',
      title: 'Proof of income',
      plainExplanation: 'Documents that show money your household receives from work or other sources.',
      examples: ['Pay stubs', 'Benefits letter', 'Bank statement', 'Employer letter'],
    });
  }

  return docs;
}

function buildSchemaFromVision(pageResults: PageFieldResult[]) {
  const grouped = new Map<string, PageFieldResult[]>();
  for (const result of pageResults) {
    const key = result.sectionTitle || `Page ${result.bbox.page}`;
    grouped.set(key, [...(grouped.get(key) ?? []), result]);
  }

  const sections = [...grouped.entries()].map(([title, fields], index) => ({
    id: slugify(title) || `section_${index + 1}`,
    title,
    fields: dedupeFields(fields.map((field) => sanitizeVisionField(field, field.bbox.page, []))),
  }));

  const allFields = sections.flatMap((section) => section.fields);

  return {
    id: 'ai_detected_form',
    title: 'AI-detected PDF form',
    sections,
    documentRequirements: deriveDocumentRequirements(allFields),
  } satisfies FormSchema;
}

async function labelPageCandidatesBatchWithOpenAI(client: OpenAI, detections: PageDetection[]): Promise<PageFieldResult[]> {
  const candidatesById = new Map<string, FieldCandidate>();
  const content: Array<
    | { type: 'input_image'; image_url: string; detail: 'high' }
    | { type: 'input_text'; text: string }
  > = [
    {
      type: 'input_text',
      text: `Analyze these ${detections.length} PDF page image(s) together. Return one combined fields array. Keep each field bbox.page equal to the page it appears on.`,
    },
  ];

  for (const detection of detections) {
    const candidatePayload = detection.candidates.map((candidate) => {
      candidatesById.set(candidate.id, candidate);
      return {
        id: candidate.id,
        labelHint: candidate.labelHint,
        typeHint: candidate.typeHint,
        bbox: candidate.bbox,
      };
    });

    content.push(
      {
        type: 'input_image',
        image_url: `data:image/jpeg;base64,${detection.imageBase64}`,
        detail: 'high',
      },
      {
        type: 'input_text',
        text: JSON.stringify({
          page: detection.page,
          pageWidth: detection.width,
          pageHeight: detection.height,
          candidates: candidatePayload,
        }),
      }
    );
  }

  const response = await client.responses.create({
    model: OPENAI_EXTRACT_MODEL,
    instructions: PAGE_VISION_PROMPT,
    input: [
      {
        role: 'user',
        content,
      },
    ],
    max_output_tokens: Math.min(12000, 3500 * detections.length),
    text: {
      format: {
        type: 'json_schema',
        name: 'page_fields',
        strict: false,
        schema: PAGE_FIELD_JSON_SCHEMA,
      },
    },
  });

  const rawText = response.output_text?.trim();
  if (!rawText) return [];

  const parsed = JSON.parse(rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim()) as {
    fields?: PageFieldResult[];
  };

  return (parsed.fields ?? []).map((field) => {
    const candidate = candidatesById.get(field.candidateId);
    const page = candidate?.page ?? field.bbox.page;
    const bbox = candidate?.bbox ?? field.bbox;
    return {
      ...field,
      bbox: { ...bbox, page },
      sectionTitle: field.sectionTitle || `Page ${page}`,
    };
  });
}

async function extractSchemaWithVision(client: OpenAI, pdfBase64: string): Promise<FormSchema> {
  const detections = await createPageDetections(pdfBase64);
  if (detections.length === 0) {
    throw new Error('No candidate fields detected in PDF pages');
  }

  const fields = await labelPageCandidatesBatchWithOpenAI(client, detections);

  if (fields.length === 0) {
    throw new Error('OpenAI did not identify any fields from the detected candidates');
  }

  return buildSchemaFromVision(fields);
}

async function extractSchemaFromWholePdf(client: OpenAI, pdfBase64: string): Promise<FormSchema> {
  const response = await client.responses.create({
    model: OPENAI_EXTRACT_MODEL,
    instructions: SYSTEM_PROMPT,
    input: [
      {
        role: 'user',
        content: [
          {
            type: 'input_file',
            filename: 'form.pdf',
            file_data: `data:application/pdf;base64,${pdfBase64}`,
          },
          {
            type: 'input_text',
            text: 'Extract all form fields from this PDF. Return only the JSON schema — no markdown, no code fences.',
          },
        ],
      },
    ],
    max_output_tokens: 8192,
    text: {
      format: {
        type: 'json_schema',
        name: 'form_schema',
        strict: false,
        schema: FORM_SCHEMA_JSON_SCHEMA,
      },
    },
  });

  const rawText = response.output_text?.trim();
  if (!rawText) {
    throw new Error('No text response from OpenAI');
  }

  try {
    const raw = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '').trim();
    return JSON.parse(raw) as FormSchema;
  } catch {
    throw new Error('OpenAI returned invalid JSON');
  }
}

async function getPdfBase64(pdfUrl?: string, pdfBase64?: string): Promise<string> {
  if (pdfBase64) return pdfBase64;
  if (!pdfUrl) throw new Error('No PDF provided');

  if (pdfUrl.startsWith('/')) {
    const filePath = path.join(process.cwd(), 'public', pdfUrl);
    const bytes = await readFile(filePath);
    return bytes.toString('base64');
  }

  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);
  const bytes = await res.arrayBuffer();
  return Buffer.from(bytes).toString('base64');
}

async function classifyUploadKind(pdfBase64: string): Promise<UploadClassification> {
  try {
    const items = await extractPdfTextItems(pdfBase64);
    const texts = items.map((item) => item.text.trim()).filter(Boolean);
    const joined = texts.join(' ');
    const hasTemplateSignals = /(application|county|benefits|calfresh|medi-cal|social security|address|income)/i.test(joined);
    const likelyEnteredValues = texts.filter((text) => {
      if (text.length < 2 || text.length > 80) return false;
      if (/^[_\s]+$/.test(text)) return false;
      if (/^(yes|no|n\/a|none)$/i.test(text)) return true;
      if (/\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(text)) return true;
      if (/\b\d{3}[-.\s]\d{2}[-.\s]\d{4}\b/.test(text)) return true;
      if (/\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b/.test(text)) return true;
      if (/\$ ?\d[\d,]*(\.\d{2})?/.test(text)) return true;
      if (/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text)) return true;
      return /@/.test(text);
    });

    if (likelyEnteredValues.length >= 6) {
      return { uploadKind: 'filled', uploadKindConfidence: 0.74 };
    }

    if (hasTemplateSignals && likelyEnteredValues.length <= 2) {
      return { uploadKind: 'blank', uploadKindConfidence: 0.68 };
    }

    return { uploadKind: 'unknown', uploadKindConfidence: 0.35 };
  } catch {
    return { uploadKind: 'unknown', uploadKindConfidence: 0 };
  }
}

function getErrorStatus(err: unknown): number {
  const status = (err as { status?: unknown })?.status;
  return typeof status === 'number' && status >= 400 && status <= 599 ? status : 500;
}

function getErrorMessage(err: unknown): string {
  if (getErrorStatus(err) === 429) {
    return `OpenAI is rate limiting this demo right now. Wait about 20 seconds and try again, or lower FORMFLOW_MAX_VISION_PAGES to 1 in .env.local while demoing.`;
  }
  return err instanceof Error ? err.message : 'OpenAI API error';
}

export async function POST(req: NextRequest) {
  let pdfUrl: string | undefined;
  let pdfBase64: string | undefined;

  try {
    const body = await req.json();
    pdfUrl = body.pdfUrl;
    pdfBase64 = body.pdfBase64;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!pdfUrl && !pdfBase64) {
    return NextResponse.json({ error: 'pdfUrl or pdfBase64 is required' }, { status: 400 });
  }

  let b64: string;
  try {
    b64 = await getPdfBase64(pdfUrl, pdfBase64);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read PDF';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const classification = await classifyUploadKind(b64);
    const client = new OpenAI();
    let schema: FormSchema;
    try {
      schema = await extractSchemaWithVision(client, b64);
    } catch (visionErr) {
      const status = getErrorStatus(visionErr);
      if (status !== 500) throw visionErr;

      console.warn('Vision extraction failed, falling back to whole-PDF extraction', {
        message: getErrorMessage(visionErr),
      });
      schema = await extractSchemaFromWholePdf(client, b64);
      schema = await refineFieldBoxes(b64, schema);
    }

    return NextResponse.json({ schema, ...classification });
  } catch (err) {
    const status = getErrorStatus(err);
    const message = getErrorMessage(err);
    console.error('OpenAI extract failed', { status, message });
    return NextResponse.json({ error: message }, { status });
  }
}

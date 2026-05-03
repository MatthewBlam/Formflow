# FormFlow — Project Context

## Memory

### Current Direction
- PDF highlighting/field overlays were removed. The form workspace now renders the PDF plainly and uses the right-side guide to walk page by page through fields detected by AI extraction.
- Page guidance lives in `components/panel/page-walkthrough.tsx`; `components/pdf/field-overlay.tsx`, `components/pdf/overlay-layer.tsx`, and `hooks/use-pdf-dimensions.ts` were deleted.

### Plan Location
Implementation plan source: `/Users/mattyb/.claude/plans/read-my-kiro-brainstorming-purring-wall.md`

Kiro specs: `/Users/mattyb/Projects/kiro-hacks/.kiro/specs/bridgeform-mvp/` (requirements.md + design.md)
PRD: `/Users/mattyb/Projects/kiro-hacks/FormFlow_MVP_PRD.md`

All shadcn components use `--preset b3963UvzV`

### Phase Progress

**Status: ALL 7 PHASES COMPLETE — MVP ready for demo**

#### Phase 1 — Foundation (DONE)
- `types/index.ts`, `lib/constants.ts`, `store/form-store.ts`, `store/selectors.ts`
- 36 tests

#### Phase 2 — PDF Rendering + Visual Form Map (DONE)
- `lib/pdf-worker.ts`
- `components/pdf/pdf-controls.tsx`, `pdf-viewer.tsx`
- `app/form/layout.tsx`, `app/form/page.tsx`
- PdfViewer is dynamically imported with `ssr: false` (fixes DOMMatrix error)
- PDF field highlighting was removed after the initial implementation

#### Phase 3 — Landing Page + Upload Flow (DONE)
- `hooks/use-file-upload.ts`, `components/landing/upload-zone.tsx`, `processing-steps.tsx`, `hero-section.tsx`
- `app/page.tsx` — landing page: Try Demo → `/saws2plus.pdf`, Upload → blob URL, POST `/api/extract` → navigate `/form`
- `app/api/extract/route.ts` — hardcoded mock schema with 9 fields on page 1 (name, DOB, SSN, address)
- `app/api/pdf-proxy/route.ts` — proxies external PDFs (not currently used)
- `public/saws2plus.pdf` — local copy of SAWS 2 PLUS form; `DEMO_PDF_URL = '/saws2plus.pdf'`
- shadcn: `input`, `progress`, `separator`
- 13 tests

#### Phase 4 — Field Interview Panel (DONE)
- `components/panel/field-explainer.tsx` — plainLanguageLabel/label, whyAsking, exampleAnswer
- `components/panel/interview-panel.tsx` — textarea + Save; calls onSubmit(fieldId, value), clears on submit
- `components/panel/page-walkthrough.tsx` — current page fields, answer box, page navigation, save-and-continue flow
- `components/panel/panel-container.tsx` — tabbed Guide / Checklist / Documents; progress bar at top
- `app/form/page.tsx` — right panel wired: currentPage + activeFieldId → page guide; onSaveAnswer → updateProfileEntry; onSelectField → setActiveFieldId
- shadcn: `card`, `tabs`, `textarea`
- 14 tests

#### Phase 5 — Completion Checklist + Progress Bar (DONE)
- `components/panel/progress-bar.tsx` — uses base-ui Progress with ProgressValue render fn
- `components/panel/completion-checklist.tsx` — required fields grouped by section, status icons, click to select
- PanelContainer updated: progress bar at top, 3 tabs (Explain/Answer/Checklist), defaults to Checklist when no field active
- shadcn: `badge`

#### Phase 6 — Document Checklist (DONE)
- `components/panel/document-checklist.tsx` — list of docs with title/plainExplanation/examples, toggle present/needed
- PanelContainer updated: 4 tabs (Explain/Answer/Checklist/Documents), passes documentStatusMap + onSetDocumentStatus
- `app/form/page.tsx` wired: documentStatusMap + setDocumentStatus from store
- `app/api/extract/route.ts` now returns 4 documentRequirements for demo
- **Total: 106 tests passing (15 test files)**

#### Phase 7 — OpenAI API Extraction (DONE)
- `app/api/extract/route.ts` — real OpenAI Responses API call replacing the stub
  - Uses `OPENAI_EXTRACT_MODEL` when set, otherwise `gpt-4.1-mini`
  - Accepts `pdfBase64` (uploads) or `pdfUrl` (relative paths read via `readFile`)
  - Primary path renders each PDF page to an image, detects candidate controls, then asks OpenAI vision to label candidates page-by-page
  - Whole-PDF `input_file` extraction remains a fallback if local page rendering/candidate detection fails
  - `FORMFLOW_MAX_VISION_PAGES` can cap page-by-page processing for large PDFs
  - Falls back to 500 on JSON parse failure
- `app/page.tsx` — converts uploaded file to base64 before POST (blob URLs can't be fetched server-side)
- **Total: 112 tests passing (16 test files)**
- **Requires `OPENAI_API_KEY` env var at runtime**

---

## Implementation Plan

### Context

FormFlow is a hackathon MVP that transforms the California SAWS 2 PLUS government PDF form into an interactive guided completion workflow. Target users are elderly immigrants and non-native English speakers. The Kiro specs provide comprehensive requirements (18 requirements with acceptance criteria) and a full architecture design. The project already has Next.js 16, shadcn/ui, react-pdf, zustand, zod, and openai installed. This plan implements the demo-ready MVP in 7 phases.

**Demo PDF:** https://www.dhcs.ca.gov/formsandpubs/laws/Documents/SPA%2013-022%20Attachment%202%20SAWS%202%20PLUS_FINAL%207%2024%2013%20ADA.pdf

**All UI components:** Use shadcn MCP with `--preset b3963UvzV`

---

### Phase 1: Foundation (Data Models, Store)

**Dependencies:** None

#### Files to Create

| File | Purpose |
|------|---------|
| `types/index.ts` | All TypeScript interfaces (FormSchema, FormSection, FormField, BoundingBox, ProfileEntry, Issue, DocumentRequirement, ExplainerContent, FieldStatus, AnswerSource) |
| `lib/constants.ts` | Demo PDF URL, app config, status-to-color mapping |
| `store/form-store.ts` | Zustand store with persist middleware |
| `store/selectors.ts` | Derived state: fieldStatusMap, issues, completionPercentage, suggestedNextStep |

**No pre-seeded schema or interview-questions files.** All form structure is derived at runtime from AI extraction.

#### Key Details

**Zustand Store** — source-of-truth state only:
- `formSchema: FormSchema | null`
- `extractionStatus: 'idle' | 'processing' | 'complete' | 'error'`
- `extractionError: string | null`
- `pdfUrl: string | null`
- `applicationProfile: Record<string, ProfileEntry>`
- `documentStatusMap: Record<string, 'needed' | 'present'>`
- `language: 'en' | 'es'`
- `currentPage: number`
- `activePanelView: 'explainer' | 'interview' | 'checklist' | 'review' | null`
- `activeFieldId: string | null`

Persist config: `partialize` excludes transient UI state (`extractionStatus`, `extractionError`), `version: 1` for future migrations, key `formflow-session`.

**Selectors** (pure functions, not stored):
- `getFieldStatusMap(state)` — derives from profile entries + contradiction results
- `getIssues(state)` — calls contradiction detector (stub [] until Phase 5)
- `getCompletionPercentage(state)` — required fields complete / total required
- `getSuggestedNextStep(state)` — priority: issues > missing docs > missing fields > "ready"

---

### Phase 2: PDF Rendering + Visual Form Map

**Dependencies:** Phase 1 (types, store) + Phase 7 `/api/extract` (overlays render once `formSchema` is populated)

**shadcn components:** `card`, `badge`, `tooltip`

#### Files to Create

| File | Purpose |
|------|---------|
| `lib/pdf-worker.ts` | Configure pdfjs-dist worker for react-pdf v10 |
| `components/pdf/pdf-viewer.tsx` | Document + Page rendering with loading state |
| `components/pdf/pdf-controls.tsx` | Page navigation (prev/next/page indicator) |
| `components/pdf/overlay-layer.tsx` | Absolute-positioned container over PDF page |
| `components/pdf/field-overlay.tsx` | Single field bounding box with status color + label |
| `hooks/use-pdf-dimensions.ts` | Track rendered page dimensions for overlay scaling |
| `app/form/page.tsx` | FormWorkspace: 2-column layout (PDF left, panel right) |
| `app/form/layout.tsx` | Workspace layout wrapper |

#### Key Details

**react-pdf v10 setup:**
```tsx
import { Document, Page } from 'react-pdf';
// Worker configured via lib/pdf-worker.ts imported at app level
```

**OverlayLayer:** Positioned `absolute inset-0` over the Page component. Filters schema fields by current page, renders FieldOverlay for each. Uses `usePdfDimensions` to convert percentage bboxes to pixel positions.

**Field Status Colors:**
- `missing` → yellow border/bg
- `complete` → green border/bg
- `needs_confirmation` → orange border/bg
- `inferred` → blue border/bg
- `conflicting` → red border/bg
- Gray for neutral section outlines
- Blue glow for hover/focus (not persisted)

**FormWorkspace layout:** `grid grid-cols-[3fr_2fr]` on desktop, stacks on mobile. Left = PDF + overlays, Right = side panel (Phase 4).

---

### Phase 3: Landing Page + Upload Flow

**Dependencies:** Phase 2 (form workspace to navigate to)

**shadcn components:** `input`, `progress`, `separator`, `dialog`

#### Files to Create

| File | Purpose |
|------|---------|
| `app/page.tsx` | Landing page (replace boilerplate) |
| `components/landing/hero-section.tsx` | Headline, subtext, privacy note |
| `components/landing/upload-zone.tsx` | Drag-drop file upload with validation |
| `components/landing/processing-steps.tsx` | Animated step indicator |
| `hooks/use-file-upload.ts` | PDF validation (type, size), blob URL creation |

#### Key Details

**Landing page:** Large text, high contrast, minimal clutter. Two CTAs:
1. "Try Demo Form" (primary) — fetches the pinned SAWS 2 PLUS PDF URL, runs it through `/api/extract`, navigates to /form
2. "Upload a PDF" (secondary) — file picker, validates, runs same extraction pipeline

Both paths go through the identical extraction flow — no special-casing for the demo form.

**Extraction flow:**
1. Set `extractionStatus = 'processing'`, store `pdfUrl`
2. POST to `/api/extract` (PDF blob or URL)
3. On success: `setFormSchema(result)`, `extractionStatus = 'complete'`, navigate to `/form`
4. On error: `extractionStatus = 'error'`, `extractionError = message`, show retry UI

**Processing animation:** 3 steps shown while extraction is in-flight:
1. "Reading form..."
2. "Finding sections and fields..."
3. "Preparing your guide..."
Then auto-navigates to `/form` once extraction resolves.

**Privacy note:** "Your progress is saved only in this browser. When AI help is used, selected form text or answers may be sent for AI processing. No account required."

---

### Phase 4: Explainer Panel + Interview Engine

**Dependencies:** Phase 1 (store, questions), Phase 2 (workspace), Phase 3 (can reach /form)

**shadcn components:** `tabs`, `scroll-area`, `textarea`, `skeleton`

#### Files to Create

| File | Purpose |
|------|---------|
| `components/panel/side-panel.tsx` | Tabbed container: Interview / Field Help / Documents |
| `components/panel/interview-flow.tsx` | Sequential question flow with progress |
| `components/panel/interview-card.tsx` | Single question: text, input, submit, skip, back |
| `components/panel/explainer-panel.tsx` | Field explanation display |
| `lib/interview-engine.ts` | Deterministic question sequencing |
| `hooks/use-interview.ts` | Interview state: current question, navigation, answer submission |

#### Key Details

**Interview Engine** — deterministic, schema-driven, questions derived from extracted `FormSchema`:
- Questions are generated on the fly from `FormSchema.sections[].fields` — no separate questions file
- Each `FormField` has `label`, `type`, `required`, and `plainLanguageLabel` (set by extractor) to drive the question card
- Questions ordered by section → field order in extracted schema
- Skip already-answered fields
- `getNextQuestion(schema, profile)` returns next unanswered field or null
- Supports back navigation (revise prior answers)
- On answer: call `/api/normalize-answer`, store result, advance

**InterviewCard UI:**
- Question text (large, plain language)
- Input area (type-appropriate: text, date picker, select, number)
- "Submit" button
- "I'm not sure" button → sets field to `needs_confirmation`
- "Why are you asking?" expandable → shows whyAsking text
- "Back" to previous question

**ExplainerPanel:** Triggered when user clicks a field overlay:
- Shows: meaning, whyAsked, exampleAnswer, documentsNeeded, commonMistake
- Action buttons: "Fill this with me" (starts interview at that field)
- Always calls `/api/explain` with `{ fieldId, sectionContext, language }` to fetch explanation content

**Side panel tabs:**
- Interview (default active when interview running)
- Field Help (active when field clicked)
- Documents (Phase 5)

---

### Phase 5: Contradiction Detection + Document Checklist

**Dependencies:** Phase 1 (store), Phase 4 (answers in profile)

**shadcn components:** `alert`, `checkbox`, `collapsible`

#### Files to Create

| File | Purpose |
|------|---------|
| `lib/contradiction-detector.ts` | 5 rule functions |
| `lib/document-checklist.ts` | Derives documents from profile + schema |
| `components/panel/issue-card.tsx` | Single issue display with suggestion |
| `components/panel/document-card.tsx` | Single document requirement |
| `components/panel/document-checklist.tsx` | Full checklist in Documents tab |

#### Key Details

**5 Contradiction Rules** (pure functions, `(profile, schema, docStatusMap) => Issue | null`):
1. Employment vs Income: unemployed + income > 0
2. Household size vs member count mismatch
3. Address proof missing: address filled, proof_of_address not present
4. Income proof missing: income filled, proof_of_income not present
5. Signature missing: required signature field not complete

**Document Checklist:**
- Generated from schema `documentRequirements` + profile state
- Each shows: title, plainExplanation, examples, status (needed/present)
- User can check "I have this document" → status = present → re-evaluates issues

**Integration:** Wire `getIssues` selector to call real `runContradictionDetection()`. Issues display as red badges on field overlays + in issues list.

---

### Phase 6: Review Dashboard + Polish

**Dependencies:** All prior phases

**shadcn components:** `select`, `switch`, `accordion`

#### Files to Create

| File | Purpose |
|------|---------|
| `app/form/review/page.tsx` | Review dashboard |
| `components/review/completion-summary.tsx` | % complete + section breakdown |
| `components/review/section-status.tsx` | Per-section field list with statuses |
| `components/review/issues-summary.tsx` | Unresolved contradictions |
| `components/review/next-steps.tsx` | Suggested actions |
| `components/layout/header.tsx` | App header with progress + language toggle |
| `components/layout/language-toggle.tsx` | EN/ES switcher |
| `components/layout/progress-bar.tsx` | Global completion bar |
| `components/layout/disclaimer-banner.tsx` | "Guidance only — not legal advice" |

#### Key Details

**Review Dashboard shows:**
- Overall completion percentage
- Section-by-section status (accordion expandable)
- Fields with status missing/needs_confirmation/conflicting grouped by section
- Unresolved issues with suggested resolution
- Document checklist summary
- Suggested next step
- Click any field → navigate to it on PDF + open explainer

**Language Toggle:** EN/ES. Stores in Zustand. All translated text fetched from `/api/translate` — no pre-seeded translations.

**Disclaimer:** Persistent banner: "This is guidance only — not legal advice. Always verify with your caseworker."

**Accessibility:** Min 16px body text, 20px headings. 4.5:1 contrast. Keyboard nav for overlays + interview. aria-labels on status indicators.

---

### Phase 7: API Route Handlers (OpenAI)

**Dependencies:** None — build `/api/extract` first (before Phase 1), then remaining routes alongside Phases 3–4

#### Files to Create

| File | Purpose |
|------|---------|
| `app/api/explain/route.ts` | Plain-language field explanation |
| `app/api/normalize-answer/route.ts` | Answer validation + normalization |
| `app/api/translate/route.ts` | Text translation (EN→ES) |
| `app/api/extract/route.ts` | Full PDF extraction — parses PDF text, returns FormSchema |
| `lib/openai-client.ts` | Shared OpenAI client + config |
| `lib/prompts.ts` | System prompts with guardrails |
| `.env.local.example` | OPENAI_API_KEY template |

#### Key Details

**Model:** `gpt-4o-mini` for explain/normalize/translate; `gpt-4o` for extract (needs reasoning to structure form fields)

**Structured Outputs:** All responses validated with Zod schemas before returning to client. Invalid responses → fallback text, logged error.

**System prompts enforce guardrails:**
- Never guarantee eligibility
- Never give legal advice
- Use hedging: "This may apply to you", "You should double-check"
- Plain language, 8th-grade reading level

**Endpoints:**
- `POST /api/explain` → `{ fieldId, sectionContext, language }` → `ExplainerContent`
- `POST /api/normalize-answer` → `{ answer, expectedType, fieldContext }` → `{ typedValue, confidence, needsClarification }`
- `POST /api/translate` → `{ texts[], targetLanguage, context }` → `{ translations[] }`
- `POST /api/extract` → `multipart/form-data` with `file` (PDF blob) or `url` (string) → `FormSchema`

**Install before building:** `npm install pdf-parse @types/pdf-parse`

**`/api/extract` implementation:**
1. Accept PDF via `multipart/form-data` file upload or `{ url }` JSON body; if URL, server-side fetch → buffer
2. Use `pdf-parse` (server-side) to extract raw text content + per-page item positions (`data.text`, iterate `data.pages` for item-level `x`, `y`, `width`, `height` in PDF pts)
3. Send text to `gpt-4o` with a structured output prompt asking it to identify:
   - Sections (title, fields)
   - For each field: id (snake_case), label, plainLanguageLabel, type (text/date/number/checkbox/select), required, page number, approximate bounding box as 0–1 normalized coordinates
   - Document requirements inferred from instructions text
4. Validate response with Zod `FormSchema` shape
5. Return validated schema; on parse failure return 422 with error details

**Bounding box coordinate math:** pdf-parse item positions are in PDF points (origin bottom-left). Convert to normalized 0–1 page-percentage coords:
```
normalizedX = item.x / pageWidth
normalizedY = 1 - ((item.y + item.height) / pageHeight)  // flip Y axis (PDF origin is bottom)
normalizedW = item.width / pageWidth
normalizedH = item.height / pageHeight
```
Page dimensions come from `data.pages[n].view` (`[0, 0, width, height]`). Overlays won't be pixel-perfect but close enough for the demo.

---

### Critical Path for Working Demo

**Phase 7 must come first** (or in parallel with Phase 1) because the entire app depends on real extraction.

Recommended build order: **Phase 7** (`/api/extract` only) → **Phase 1** → **Phase 3** → **Phase 2** → **Phase 4** → Phase 5 → Phase 6

This gives: Landing → Upload/Demo PDF → AI extracts schema → PDF with colored overlays → Guided interview → Fields turn green as answered.

---

### Verification

1. `npm run dev` — app starts, landing page renders
2. Click "Try Demo Form" → processing animation → PDF renders with colored overlays
3. Click a field overlay → explainer panel opens with explanation
4. Start interview → questions appear one at a time → answers update field colors
5. Answer contradicting info → red conflicting indicators appear
6. Navigate to /form/review → completion summary shows correct %
7. Toggle language → UI text switches, state preserved
8. Close browser, reopen → session restores from localStorage
9. `npm test` — all unit tests pass

---

### File Structure Summary

```
formflow/
├── app/
│   ├── page.tsx                         (landing)
│   ├── form/
│   │   ├── page.tsx                     (workspace)
│   │   ├── layout.tsx
│   │   └── review/page.tsx              (dashboard)
│   └── api/
│       ├── explain/route.ts
│       ├── normalize-answer/route.ts
│       ├── translate/route.ts
│       └── extract/route.ts
├── components/
│   ├── ui/                              (shadcn --preset b3963UvzV)
│   ├── pdf/
│   │   ├── pdf-viewer.tsx
│   │   ├── pdf-controls.tsx
│   │   ├── overlay-layer.tsx
│   │   └── field-overlay.tsx
│   ├── panel/
│   │   ├── side-panel.tsx
│   │   ├── interview-flow.tsx
│   │   ├── interview-card.tsx
│   │   ├── explainer-panel.tsx
│   │   ├── issue-card.tsx
│   │   ├── document-card.tsx
│   │   └── document-checklist.tsx
│   ├── landing/
│   │   ├── hero-section.tsx
│   │   ├── upload-zone.tsx
│   │   └── processing-steps.tsx
│   ├── review/
│   │   ├── completion-summary.tsx
│   │   ├── section-status.tsx
│   │   ├── issues-summary.tsx
│   │   └── next-steps.tsx
│   └── layout/
│       ├── header.tsx
│       ├── language-toggle.tsx
│       ├── progress-bar.tsx
│       └── disclaimer-banner.tsx
├── hooks/
│   ├── use-pdf-dimensions.ts
│   ├── use-file-upload.ts
│   ├── use-interview.ts
│   └── use-explainer.ts
├── store/
│   ├── form-store.ts
│   └── selectors.ts
├── lib/
│   ├── utils.ts (existing)
│   ├── constants.ts
│   ├── pdf-worker.ts
│   ├── interview-engine.ts
│   ├── contradiction-detector.ts
│   ├── document-checklist.ts
│   ├── openai-client.ts
│   └── prompts.ts
└── types/
    └── index.ts
```

> **No `data/` directory** — all form structure comes from `/api/extract` at runtime.

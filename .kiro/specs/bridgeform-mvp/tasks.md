# Implementation Plan: FormFlow MVP

## Overview

This plan implements FormFlow following the hackathon priority order: reliable demo core first, then stateful interview, issues/documents, review screen, and AI polish. Each task builds incrementally so the app is demoable at every checkpoint. All code is TypeScript with Next.js 14+ App Router, Tailwind CSS, shadcn/ui, react-pdf, Zustand, and Vitest + fast-check.

## Tasks

- [x] 1. Project scaffolding and core data types
  - [x] 1.1 Initialize Next.js 14+ App Router project with TypeScript, Tailwind CSS, and shadcn/ui
    - Run `npx create-next-app@latest` with App Router and TypeScript
    - Install dependencies: `react-pdf`, `zustand`, `zod`, `openai`, `vitest`, `fast-check`, `@testing-library/react`, `msw`
    - Configure Tailwind CSS and shadcn/ui
    - Set up Vitest config (`vitest.config.ts`) with path aliases
    - _Requirements: 14.1, 14.3_

  - [x] 1.2 Define core data model types and Zod schemas
    - Create `lib/types/schema.ts` with `FormSchema`, `FormSection`, `FormField`, `BoundingBox`, `FieldStatus`, `AnswerSource` types
    - Create `lib/types/profile.ts` with `ProfileEntry`, `Issue`, `DocumentRequirement` types
    - Create `lib/types/interview.ts` with `InterviewQuestion`, `InterviewSession`, `ExplainerContent` types
    - Create `lib/types/session.ts` with `SessionState`, `PersistedState` types
    - Create matching Zod schemas in `lib/schemas/` for runtime validation of each type
    - _Requirements: 3.1, 7.1, 17.1, 17.4, 18.1_

  - [ ]* 1.3 Write property tests for schema validation
    - **Property 1: Schema Structural Integrity — every FormField.sectionId references an existing FormSection.id**
    - **Property 25: Invalid Schema JSON Returns Descriptive Error — missing required properties produce specific validation errors**
    - **Validates: Requirements 3.3, 17.4**

- [x] 2. Pre-seeded demo schema and PDF rendering (Priority 1: Reliable Demo Core)
  - [x] 2.1 Create pre-seeded SAWS 2 PLUS demo form schema
    - Create `public/schemas/saws-2-plus.json` with the full `FormSchema` object
    - Include 15–25 high-impact fields across 5 sections: Applicant Information, Household Information, Income, Expenses, Signature/Certification
    - Each field must have: `id`, `sectionId`, `questionId`, `profileKey`, `label`, `plainLabel`, `page`, `bbox` (percentage coordinates), `fieldType`, `required`, `requiredForDemo`, `status: "missing"`, `evidenceRequired`, and pre-written `translations.es` for demo fields
    - Include `documentRequirements` array with entries for proof of address, proof of income, proof of identity, and proof of household composition
    - Include pre-written `ExplainerContent` for each demo field (meaning, whyAsked, exampleAnswer, documentsNeeded, commonMistake) with Spanish translations
    - _Requirements: 3.1, 3.2, 5.6, 11.2_

  - [ ]* 2.2 Write property test for fresh schema initialization
    - **Property 2: Fresh Schema Initialization — every FormField in a loaded schema has status initialized to "missing"**
    - **Validates: Requirements 3.6**

  - [x] 2.3 Implement PDF viewer component with react-pdf
    - Create `components/PdfViewer.tsx` that renders PDF pages via react-pdf
    - Accept props: `fileUrl`, `currentPage`, `onPageChange`, `pageWidth`
    - Implement page navigation controls (previous/next page buttons, page number display)
    - Display loading indicator while PDF renders
    - Handle PDF rendering errors with user-friendly message and "Try demo form" fallback
    - Configure react-pdf worker (PDF.js) for Next.js App Router
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 2.4 Implement field overlay layer on top of PDF
    - Create `components/FieldOverlay.tsx` for a single colored bounding box with plain-language label
    - Create `components/OverlayLayer.tsx` that positions all `FieldOverlay` components over the PDF using percentage-based coordinates
    - Create `lib/ui/statusColors.ts` with the status-to-color mapping function: missing→yellow, complete→green, needs_confirmation→orange, inferred→blue, conflicting→red, plus gray for section outlines and blue outline/glow for hover/focus
    - Each overlay must include a text label and accessible status indicator (not color-only)
    - Support keyboard focus and click handlers on overlays
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 12.3, 12.8_

  - [ ]* 2.5 Write property test for status-to-color mapping
    - **Property 3: Field Status to Color Mapping — the mapping is total and correct for all valid FieldStatus values**
    - **Validates: Requirements 4.2**

  - [x] 2.6 Implement progress bar component
    - Create `components/ProgressBar.tsx` showing completion percentage with accessible label
    - Calculate percentage as: required fields with status "complete" / total required fields
    - Handle zero required fields case (show 100%)
    - _Requirements: 4.5, 12.7_

  - [ ]* 2.7 Write property test for completion percentage calculation
    - **Property 4: Completion Percentage Calculation — correct ratio of complete required fields to total required fields, 100% when zero required fields**
    - **Validates: Requirements 4.5, 10.1**

  - [x] 2.8 Build the FormWorkspace page layout
    - Create `app/form/page.tsx` as the main workspace with PDF viewer (left) and side panel (right)
    - Include top bar with progress bar, language toggle placeholder, and navigation breadcrumbs
    - Manage panel state: explainer, interview, checklist, or review
    - Load pre-seeded schema from `public/schemas/saws-2-plus.json` on demo path
    - Load demo PDF from pinned DHCS URL (or cached local copy)
    - Render PDF with overlay layer showing all demo fields
    - Stack layout vertically on mobile (responsive)
    - _Requirements: 2.1, 3.1, 4.1_

- [-] 3. Explainer panel and landing page (Priority 1 continued)
  - [ ] 3.1 Implement ExplainerPanel component
    - Create `components/ExplainerPanel.tsx` displaying plain-language explanation when a field overlay is clicked
    - Show: meaning, whyAsked, exampleAnswer, documentsNeeded, commonMistake
    - Include action buttons: "Fill this with me," "Show example," "Why do they ask this?", "What proof do I need?"
    - Load pre-seeded explanation content from the schema for demo fields
    - Include visible "This is guidance only — not legal advice" disclaimer
    - Use language at or below eighth-grade reading level (pre-seeded content)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6, 13.6_

  - [ ]* 3.2 Write property test for ExplainerContent structure
    - **Property 5: ExplainerContent Structure Completeness — meaning, whyAsked, exampleAnswer, documentsNeeded are all present and non-empty**
    - **Validates: Requirements 5.2**

  - [ ] 3.3 Build the Landing Page
    - Create `app/page.tsx` with hero section: clear headline explaining FormFlow's purpose in plain language
    - Two primary CTAs: "Upload a PDF" and "Try demo form"
    - Large text (min 20px headings, 16px body), high contrast (4.5:1 minimum), minimal clutter
    - Include privacy note: "Your progress is saved only in this browser. When AI help is used, selected form text, page images, or answers may be sent for AI processing. No account is required."
    - Include persistent disclaimer: guidance only, not legal advice
    - "Try demo form" navigates to `/form` with demo schema loaded
    - "Upload a PDF" opens file upload flow
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 12.1, 12.2, 13.4_

  - [ ] 3.4 Implement FileUpload component and upload processing feedback
    - Create `components/FileUpload.tsx` with drag-and-drop or click upload, accepting only PDF files
    - Validate file type (PDF MIME type) and size (max 10MB) client-side
    - Show descriptive error messages for invalid file type or oversized file
    - Create `components/ProcessingSteps.tsx` showing animated step-by-step progress: "Reading form," "Finding sections," "Finding questions," "Preparing plain-language guide"
    - On upload success, display file name and transition to FormWorkspace
    - On error, offer retry or "Try demo form" fallback
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 15.1, 15.2, 15.3_

- [ ] 4. Checkpoint — Verify demo core renders correctly
  - Ensure the app builds and renders: landing page → demo form loads → PDF displays with overlays → clicking a field shows the explainer panel
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Zustand store and state management (Priority 2: Stateful Interview)
  - [ ] 5.1 Implement Zustand store with source-of-truth state and derived selectors
    - Create `lib/state/store.ts` implementing the `FormFlowStore` interface
    - Source-of-truth state: `formSchema`, `applicationProfile`, `documentStatusMap`, `sessionId`, `language`, `currentPage`, `activePanelView`
    - Implement derived selectors: `getFieldStatusMap()`, `getFieldStatus(fieldId)`, `getIssues()`, `getDocumentChecklist()`, `getCompletionPercentage()`, `getSuggestedNextStep()`
    - Implement actions: `setFormSchema`, `updateProfileEntry`, `removeProfileEntry`, `markDocumentPresent`, `markDocumentNeeded`, `setLanguage`, `setCurrentPage`, `setActivePanelView`, `resetSession`
    - Configure Zustand persist middleware to serialize `SessionState` to localStorage under key `formflow-session` with schema version tracking
    - Persist only source-of-truth data; recompute derived state on load
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 16.1, 16.2_

  - [ ]* 5.2 Write property test for session state round-trip
    - **Property 10: Session State Round-Trip via localStorage — serialize, store, retrieve, deserialize produces equivalent SessionState**
    - **Validates: Requirements 7.3**

  - [ ]* 5.3 Write property test for auto-persist on modification
    - **Property 23: Auto-Persist to localStorage on Modification — persisted state reflects modification immediately after store update**
    - **Validates: Requirements 16.2**

  - [ ] 5.4 Implement session resume and new session flow
    - On app load, check localStorage for existing session
    - If found and valid, offer to resume previous session or start new one
    - If corrupted (fails JSON parse or schema validation), discard and offer fresh start
    - "Start new session" clears previous localStorage data
    - Handle localStorage full (QuotaExceededError) and unavailable scenarios gracefully
    - _Requirements: 16.3, 16.4_

- [ ] 6. Interview engine (Priority 2 continued)
  - [ ] 6.1 Implement schema-driven interview engine logic
    - Create `lib/interview/engine.ts` that loads interview questions from the Form_Schema's field sequence
    - Interview flow is deterministic: driven by `questionId` ordering in the schema, not LLM-generated
    - Each question knows its `mappedFieldIds` and `profileKey`
    - Support starting interview from a specific field (via "Fill this with me" button)
    - Support section-scoped interview (continue until all required fields in section are addressed)
    - Track current question index and allow back navigation
    - _Requirements: 6.1, 6.8_

  - [ ] 6.2 Implement InterviewCard UI component
    - Create `components/InterviewCard.tsx` displaying one question at a time
    - Show: question text in plain language, large text input area, "I'm not sure" button, "Why are you asking?" button
    - "Why are you asking?" shows brief explanation of why the info is needed and which form field it maps to
    - Support back navigation to previous questions
    - Allow user to edit and confirm answer before finalizing
    - Display progress indicator showing interview progress within the section
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 12.5, 12.6, 12.7_

  - [ ] 6.3 Implement answer-to-profile mapping and field status updates
    - Create `lib/state/profileActions.ts` with functions to map interview answers to the ApplicationProfile
    - When user answers: store value, source (`user_chat`), confidence, mappedFieldIds, evidenceRequired, and update FieldStatus of all mapped fields
    - When user clicks "I'm not sure": set all mapped fields to `needs_confirmation`, record as uncertain
    - When user revises a prior answer: update the profile entry, recalculate FieldStatus for all affected fields (including re-running contradiction detection)
    - Support one-to-many mapping: a single answer populates multiple related fields
    - After each profile update, trigger Zustand persist to localStorage
    - _Requirements: 6.3, 6.4, 6.7, 7.1, 7.4, 7.5_

  - [ ]* 6.4 Write property tests for profile actions
    - **Property 6: Answer-to-Profile Mapping — answer mapped to N fields updates all N fields from "missing" to non-missing status**
    - **Property 7: Skip Sets Needs Confirmation — "I'm not sure" sets all mapped fields to needs_confirmation**
    - **Property 8: Answer Revision Recalculates Affected Statuses — revised answer updates profile and recalculates all mapped field statuses**
    - **Property 9: ProfileEntry Structural Completeness — every ProfileEntry has value, valid source, confidence 0.0–1.0, non-empty mappedFieldIds, valid status**
    - **Validates: Requirements 6.3, 6.4, 6.7, 7.1, 7.4**

  - [ ] 6.5 Wire interview into FormWorkspace
    - Connect "Fill this with me" button in ExplainerPanel to start interview at that field's question
    - Add interview panel view to FormWorkspace side panel
    - Update Visual Form Map overlays in real-time as answers are recorded and field statuses change
    - Update progress bar as fields are completed
    - _Requirements: 5.5, 4.3, 4.5_

- [ ] 7. Checkpoint — Verify stateful interview works end-to-end
  - Ensure: click field → explainer → "Fill this with me" → interview questions → answers update profile → overlays update colors → progress bar advances → state persists to localStorage → page refresh restores state
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Contradiction detection and document checklist (Priority 3: Issues and Documents)
  - [ ] 8.1 Implement contradiction detection engine
    - Create `lib/rules/contradictions.ts` with the `ContradictionRule` interface and five demo rules:
      - Rule 1: `employmentVsIncomeRule` — unemployed + monthly_income_from_work > 0 → contradiction
      - Rule 2: `householdSizeVsMembersRule` — household_size ≠ count of household members → contradiction
      - Rule 3: `addressProofMissingRule` — address filled + proof_of_address not present → missing_evidence
      - Rule 4: `incomeProofMissingRule` — income filled + proof_of_income not present → missing_evidence
      - Rule 5: `signatureMissingRule` — required signature field not complete → missing_required
    - Implement `runContradictionDetection()` as a pure function that evaluates all rules against current profile state
    - Each rule returns a fully valid `Issue` object or `null`; catch and skip rules that throw unexpected errors
    - Wire into Zustand store: run after every profile update, update field statuses to `conflicting` for affected fields
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 8.2 Write property tests for contradiction detection
    - **Property 11: Employment vs Income Contradiction — unemployed + income > 0 produces contradiction Issue**
    - **Property 12: Household Size vs Member Count — size ≠ member count produces contradiction Issue**
    - **Property 13: Missing Evidence Detection — non-null value + evidence required + document "needed" produces missing_evidence Issue**
    - **Property 14: Missing Required Signature — required signature field not complete produces missing_required Issue**
    - **Property 15: Contradiction Resolution Removes Issues — updating profile to resolve condition removes the Issue**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 8.8**

  - [ ] 8.3 Implement document checklist generator and UI
    - Create `lib/checklist/generator.ts` that generates the document checklist from FormSchema and ApplicationProfile
    - Include exactly the `DocumentRequirement` entries whose IDs appear in `evidenceRequired` arrays of fields with non-null profile values
    - Create `components/DocumentCard.tsx` displaying each document: title, plain-language explanation, examples of acceptable documents, status (needed/present)
    - Create `components/DocumentChecklist.tsx` that renders all DocumentCards with "I have this document" checkbox for each
    - Link each document requirement to its related form fields
    - When user marks document as present: update `documentStatusMap`, re-run contradiction detection to resolve related missing_evidence Issues
    - Dynamically update checklist when answers change (add/remove evidence requirements)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]* 8.4 Write property tests for document checklist
    - **Property 16: Document Checklist Reflects Current Evidence Requirements — checklist includes exactly the documents referenced by fields with non-null profile values**
    - **Property 17: DocumentRequirement Structural Completeness — title, plainExplanation, non-empty examples, valid status, non-empty relatedFieldIds**
    - **Property 18: Document-Field Linkage Integrity — every relatedFieldId references an existing FormField.id**
    - **Property 19: Mark Document Present Resolves Related Issues — marking present removes related missing_evidence Issues**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

  - [ ] 8.5 Wire issues and documents into FormWorkspace
    - Add issue count badge to FormWorkspace top bar
    - Create `components/IssueCard.tsx` displaying contradiction/issue with link to related field
    - Add checklist panel view to FormWorkspace side panel
    - When an Issue is created, update Visual Form Map overlays to show `conflicting` status on affected fields
    - When user resolves a contradiction (updates answer), re-evaluate rules and remove resolved Issues
    - _Requirements: 8.7, 8.8_

- [ ] 9. Checkpoint — Verify contradiction detection and document checklist
  - Ensure: answering "unemployed" then entering income > 0 triggers a contradiction → marking proof of address as present resolves the missing_evidence issue → document checklist updates dynamically
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Review dashboard (Priority 4: Review Screen)
  - [ ] 10.1 Implement Review Dashboard page
    - Create `app/form/review/page.tsx` (or panel view within FormWorkspace) as the full review dashboard
    - Display overall completion percentage (required fields with status "complete" / total required fields)
    - Display completed sections with visual section-level completion indicators
    - Display incomplete fields grouped by section: fields with status `missing`, `needs_confirmation`, or `conflicting`
    - Display all unresolved Issues with severity, message, and related fields
    - Display Document Checklist summary showing documents still needed
    - Display suggested next step based on priority: unresolved issues first, then missing documents, then missing fields; if all complete show readiness message
    - Include visible "This is guidance only — not legal advice" disclaimer
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 13.6_

  - [ ]* 10.2 Write property tests for review dashboard logic
    - **Property 20: Review Dashboard Field Grouping — incomplete fields list contains exactly fields with status missing, needs_confirmation, or conflicting, grouped by sectionId**
    - **Property 21: Suggested Next Step Derivation — references issues first, then missing documents, then missing fields; shows readiness when all complete**
    - **Validates: Requirements 10.3, 10.6**

  - [ ] 10.3 Implement click-through navigation from review to fields
    - When user clicks a missing field or unresolved Issue in the Review Dashboard, navigate to the corresponding field on the Visual Form Map or open the relevant interview question
    - _Requirements: 10.7_

- [ ] 11. Language toggle and Spanish support (Priority 5 partial)
  - [ ] 11.1 Implement language toggle and Spanish content display
    - Create `components/LanguageToggle.tsx` allowing switch between English and Spanish
    - When Spanish is selected, ExplainerPanel displays pre-seeded Spanish translations from the schema
    - When Spanish is selected, InterviewCard displays pre-seeded Spanish question text and explanations
    - Switching language preserves all ApplicationProfile data, field statuses, and issue states without loss
    - _Requirements: 11.1, 11.2, 11.3, 11.4_

  - [ ]* 11.2 Write property test for language switch state preservation
    - **Property 22: Language Switch Preserves All State — switching language does not alter profile entry values, confidence scores, mapped field IDs, field statuses, or issue states**
    - **Validates: Requirements 11.4**

- [ ] 12. Checkpoint — Verify review dashboard and language toggle
  - Ensure: review dashboard shows correct completion %, grouped fields, issues, document summary, and next step → clicking a field navigates back → language toggle switches to Spanish content without losing state
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. AI route handlers (Priority 5: AI Polish)
  - [ ] 13.1 Implement shared AI client utility
    - Create `lib/ai/client.ts` with shared OpenAI client configuration
    - Handle API key management (server-side only via `OPENAI_API_KEY` env var)
    - Implement retry logic with exponential backoff (3 attempts)
    - Implement 30-second timeout
    - Define system prompts for explainer, answerNormalizer, translator, and visionAnalyzer roles with guardrail enforcement (no eligibility guarantees, no legal advice, hedging language)
    - _Requirements: 13.1, 13.2, 13.3, 18.1_

  - [ ] 13.2 Implement POST /api/explain route handler
    - Create `app/api/explain/route.ts` accepting `ExplainRequest` (fieldId, sectionContext, language)
    - Use OpenAI Structured Outputs with strict schema for `ExplainerContent` response
    - Validate response server-side with Zod before returning
    - If validation fails, return fallback generic explanation; log validation error
    - Post-process to filter prohibited language (eligibility guarantees, legal advice)
    - _Requirements: 5.1, 5.2, 13.3, 18.1, 18.2, 18.3_

  - [ ] 13.3 Implement POST /api/normalize-answer route handler
    - Create `app/api/normalize-answer/route.ts` accepting `NormalizeAnswerRequest` (answer, expectedType, fieldContext, language)
    - Use OpenAI Structured Outputs for `NormalizeAnswerResponse` (typedValue, status, confidence, needsClarification, clarificationPrompt)
    - Validate response with Zod; if validation fails or confidence is low, preserve raw answer with `confidence: 0.0` and `status: needs_confirmation`
    - _Requirements: 6.3, 18.1, 18.2, 18.3_

  - [ ] 13.4 Implement POST /api/translate route handler
    - Create `app/api/translate/route.ts` accepting `TranslateRequest` (texts, targetLanguage, context)
    - Use OpenAI for targeted Spanish translation of demo content
    - If translation fails, fall back to English with notice: "Translation is temporarily unavailable. Showing English text."
    - _Requirements: 11.2, 11.3_

  - [ ] 13.5 Implement POST /api/extract route handler (fallback only)
    - Create `app/api/extract/route.ts` accepting `ExtractRequest` (pageTexts, pageCount)
    - Use OpenAI Structured Outputs for `ExtractResponse` (schema, confidence, extractionMethod, warnings)
    - Validate with Zod; return confidence level
    - If confidence is low, include warning suggesting demo form
    - This route is only used for non-demo uploaded PDFs; demo path bypasses it entirely
    - _Requirements: 3.3, 18.1, 18.2, 18.3_

- [ ] 14. Wire AI routes into the application
  - [ ] 14.1 Connect AI explain route to ExplainerPanel
    - When pre-seeded explanation is available, use it directly (no API call)
    - Optionally call `/api/explain` for regeneration or when pre-seeded content is missing
    - Cache AI-generated explanations by `fieldId + language` to avoid redundant calls
    - _Requirements: 5.1, 5.6_

  - [ ] 14.2 Connect AI normalize-answer route to interview flow
    - After user submits an answer in the interview, optionally call `/api/normalize-answer` to get typed value and confidence
    - If API call fails or is unavailable, use the raw answer directly with default confidence
    - If `needsClarification` is true, show the clarification prompt to the user
    - _Requirements: 6.3_

  - [ ] 14.3 Connect best-effort extraction for uploaded PDFs
    - When a non-demo PDF is uploaded, extract text client-side via PDF.js
    - Send page texts to `/api/extract` for best-effort schema generation
    - If confidence is low, display warning and offer demo form instead
    - If extraction succeeds, render PDF with low-confidence overlays
    - _Requirements: 3.3, 15.3_

- [ ] 15. Accessibility and AI safety guardrails
  - [ ] 15.1 Implement accessibility requirements across all components
    - Ensure minimum font size: 16px body text, 20px headings
    - Ensure minimum 4.5:1 color contrast ratio for all text (WCAG 2.1 AA)
    - Ensure keyboard navigation for all interactive elements: overlays, interview controls, review dashboard links
    - Ensure field status is not conveyed by color alone — add text labels, icons, tooltips, or accessible labels for each status
    - Use plain language throughout, avoid jargon without explanation
    - Display one question at a time during interview
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.8_

  - [ ] 15.2 Implement AI safety guardrails and disclaimers
    - Ensure system prompts contain required prohibitions (no eligibility guarantees, no legal advice)
    - Use hedging language: "This may apply to you," "You should double-check this," "Based on what you told me"
    - Prefer "next step" and "things to double-check" over "recommendation" language
    - Display persistent disclaimer on landing page, review dashboard, and explainer panel: "This is guidance only — not legal advice"
    - Never recommend submitting the form without reviewing first
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [ ] 16. FormSchema serialization round-trip (lower priority)
  - [ ] 16.1 Implement FormSchema parser and serializer with Zod validation
    - Create `lib/schema/serializer.ts` with `parseFormSchema(json: string): FormSchema` and `serializeFormSchema(schema: FormSchema): string`
    - Use Zod schemas for validation on parse
    - Return descriptive validation errors identifying specific missing or invalid properties
    - Ensure round-trip: parse(serialize(schema)) produces equivalent object
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [ ]* 16.2 Write property test for FormSchema serialization round-trip
    - **Property 24: FormSchema Serialization Round-Trip — serialize then parse produces equivalent FormSchema**
    - **Validates: Requirements 17.3**

- [ ] 17. Final checkpoint — Full integration verification
  - Ensure the complete demo flow works: landing page → "Try demo form" → PDF renders with overlays → click field → explainer panel → "Fill this with me" → interview → answers update overlays → contradictions detected → document checklist → review dashboard → language toggle → state persists across refresh
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation — the app is demoable after each checkpoint
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Tasks follow the hackathon priority order: demo core → stateful interview → issues/documents → review → AI polish
- The demo path (pre-seeded schema) is the primary success path; upload/extraction is fallback only
- AI routes are intentionally placed late — the core demo works without them using pre-seeded content

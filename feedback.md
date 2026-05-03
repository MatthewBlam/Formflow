# FormFlow MVP Spec Feedback

## Executive Summary

FormFlow has a strong hackathon story: it turns an intimidating government PDF into a visual, guided, stateful workflow. The target user, demo form, and core differentiator are compelling.

The main risk is scope. The current Kiro specs describe a credible product architecture, but they overstate what should be treated as required with 5 hours left. The safest path is to make the demo path explicit:

- Use the pre-seeded California SAWS 2 PLUS schema as the primary path.
- Use this exact pinned demo PDF: `https://www.dhcs.ca.gov/formsandpubs/laws/Documents/SPA%2013-022%20Attachment%202%20SAWS%202%20PLUS_FINAL%207%2024%2013%20ADA.pdf`
- Treat generic PDF upload/extraction as graceful fallback or demo theater, not the core success path.
- Keep LLMs focused on explanation, translation, answer normalization, and structured fallback extraction.
- Keep field mapping, interview progression, contradiction detection, document checklist, and review state deterministic.

## Product Naming

Use **FormFlow** consistently across specs, UI copy, code comments, demo script, and generated assets.

The specs should keep FormFlow as the only product name. The PRD, requirements, design, UI copy, code comments, and demo script should all use this name.

## High-Priority Scope Corrections

### 1. Narrow Generic PDF Extraction

The current requirements make generic PDF extraction sound mandatory. That is too risky for the remaining hackathon time.

Recommended change:

> For the demo form, FormFlow SHALL use a pre-seeded Form_Schema. For non-demo uploaded PDFs, FormFlow MAY perform best-effort extraction and SHALL clearly indicate reduced confidence when extraction is incomplete.

Implementation guidance:

- Use the pinned DHCS SAWS 2 PLUS PDF as the demo form.
- Pre-seed 15-25 high-impact fields only.
- Include applicant info, household size/members, income, rent/utilities, address proof, income proof, signature/date.
- Do not promise reliable arbitrary PDF extraction in the demo.

### 2. Make Spanish Targeted, Not Full-App Translation

The requirements make Spanish translation a full product requirement, while the PRD treats translation more like a targeted feature.

Recommended change:

> FormFlow SHALL support Spanish for demo field explanations and guided interview prompts. Full UI translation and dynamic translation of arbitrary extracted PDFs are stretch goals.

This keeps the accessibility story without adding a fragile translation layer across the entire app.

### 3. Keep AI Out of Critical State Transitions

The guided interview should be schema-driven. The LLM can phrase questions or normalize answers, but deterministic code should decide:

- which field is next,
- which field IDs an answer maps to,
- how field status changes,
- which document requirements become active,
- which contradiction rules run.

This is more reliable for a live demo and easier to debug under time pressure.

### 4. Do Not Implement PDF Fill or Submission

Keep the output as:

- form-state map,
- guided answer packet,
- issue list,
- document checklist,
- final review dashboard.

PDF fill/export can remain a stretch goal. Submission must stay explicitly out of scope.

## Stack Feedback

The selected stack is appropriate. Do not re-platform this late.

Recommended stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- react-pdf / PDF.js for browser rendering
- Zustand with persist middleware
- localStorage for no-login persistence
- Next.js Route Handlers for server-side AI calls
- OpenAI API for explanation, translation, structured extraction fallback, and answer normalization

### Next.js Wording

The design says “API routes,” but with the App Router the current Next.js terminology is **Route Handlers**. Update the wording to avoid confusion.

Recommended:

```text
Next.js Route Handlers under app/api/*/route.ts
```

### File Upload Architecture

The design currently describes `fileUrl` as “blob URL or temp path.” This is ambiguous.

Browser blob URLs are only meaningful in the browser. They are not directly readable by a server route.

Pick one MVP approach:

1. Client-rendered demo path:
   - Keep the uploaded/demo PDF in the browser.
   - Render it with react-pdf.
   - Use pre-seeded schema for the demo.
   - Avoid server-side PDF storage.

2. Server extraction path:
   - Upload the PDF to a route handler.
   - Store it temporarily server-side.
   - Return a `fileId`.
   - Use that `fileId` for extraction.

For 5 hours, prefer option 1 unless server extraction already exists.

## LLM and OpenAI Recommendations

Context7/OpenAI docs indicate the current model guidance is:

- `gpt-5.5`: flagship model for complex reasoning and coding.
- `gpt-5.4`: more affordable frontier model.
- `gpt-5.4-mini`: lower-latency/lower-cost model.
- `gpt-5.4-nano`: cheapest GPT-5.4-class option for simple high-volume tasks.

The current design lists `gpt-5.4` and `gpt-5.4-mini`, which is still reasonable. I would update the recommendation to:

- Use `gpt-5.4-mini` by default for explainer content, interview phrasing, answer normalization, and Spanish.
- Use `gpt-5.5` only for one-shot complex document reasoning if needed.
- Use `gpt-5.4-nano` only if latency/cost matter and quality is acceptable.
- Do not make live vision extraction required for the demo.

### Use Structured Outputs

OpenAI docs recommend Structured Outputs over JSON mode when possible because they enforce schema adherence, not just valid JSON.

Use Structured Outputs for:

- `ExplainerContent`
- `InterviewQuestion`
- `ExtractResponse`
- answer normalization results

The spec should explicitly say:

> AI responses that feed application state SHALL use Structured Outputs with strict schemas and server-side validation before updating Zustand state.

### Suggested AI Route Split

Keep routes minimal:

- `/api/explain`: field context to plain-language explanation.
- `/api/normalize-answer`: user answer to typed value/status/confidence.
- `/api/translate`: optional targeted Spanish for demo content.
- `/api/extract`: fallback only; pre-seeded schema bypasses it.

Avoid a fully autonomous `/api/interview` that decides application flow.

## Requirements Critique

### Requirement 3: PDF Structure Extraction

Risk: too broad.

Recommendation:

- Make pre-seeded demo schema the required path.
- Make generic extraction best-effort.
- Define “curated subset” explicitly in the requirement.

### Requirement 4: Visual Form Map Overlay

Issue: field statuses and colors are inconsistent.

The glossary defines valid statuses:

- `missing`
- `complete`
- `needs_confirmation`
- `inferred`
- `conflicting`

But Requirement 4 includes:

- gray for detected
- blue for explanation_available

Neither `detected` nor `explanation_available` is a valid `Field_Status`.

Recommendation:

- Keep status colors:
  - `missing`: yellow
  - `complete`: green
  - `needs_confirmation`: orange
  - `inferred`: blue
  - `conflicting`: red
- Use gray for neutral section outlines or inactive optional fields.
- Use blue outline/glow for hover, focus, or currently selected field, not a persisted status.

### Requirement 5: Plain-Language Field Explainer

Strong requirement. Keep it.

To reduce implementation pressure:

- Prewrite explanations for the demo fields in the schema.
- Use AI only to regenerate or translate if time allows.
- Cache generated explanations by `fieldId + language`.

### Requirement 6: Guided Interview

Keep the one-question-at-a-time model.

Recommended adjustment:

- The interview sequence should be generated from pre-seeded schema fields, not invented live by the LLM.
- Each question should already know its `mappedFieldIds`.
- The LLM can rewrite the prompt in plain language or Spanish, but should not decide mappings.

### Requirement 7 and 16: Persistence

Good MVP choice.

Recommendation:

- Persist profile answers and document statuses.
- Recompute derived data on load.
- Avoid persisting stale `issues` unless they are revalidated immediately after restore.

### Requirement 8: Contradiction Detection

Good demo feature. Keep deterministic rules.

Recommended 5-hour rule set:

- Unemployed but monthly work income greater than zero.
- Household size differs from listed household member count.
- Address entered but proof of address not marked present.
- Income entered but proof of income not marked present.
- Signature/date missing.

The paystub contradiction should remain stretch unless document upload/classification is already working.

### Requirement 9: Supporting Document Checklist

Strong, demo-friendly feature. Keep.

Recommended adjustment:

- Rename document status from `uploaded` to `present` unless actual upload is implemented.
- If upload is just a checkbox, the UI should say “I have this document,” not “uploaded.”

### Requirement 10: Final Review Dashboard

Keep this. It is likely one of the best judge-facing screens.

Recommended dashboard sections:

- completion percentage,
- ready fields,
- needs answer,
- needs proof,
- possible conflicts,
- next best action.

### Requirement 11: Spanish Translation

Keep targeted Spanish for demo. Do not require fully dynamic translation across every UI surface.

### Requirement 12: Accessibility

Keep. This is core to the product.

Add one practical implementation note:

> Color must not be the only status indicator. Each field status should also have text, icon, tooltip, or accessible label.

### Requirement 13: AI Safety Guardrails

Keep. This is important for public benefits/legal-adjacent workflows.

Recommended wording improvement:

- Avoid “recommendation” language where possible.
- Prefer “next step” and “things to double-check.”
- Add a visible “guidance only” disclaimer in the review screen and explainer panel.

### Requirement 14: Landing Page

Fine, but do not over-invest in it. The first screen should quickly move to the working demo.

### Requirement 15: Upload Processing Feedback

Keep as polished demo affordance.

For the demo form, these can be timed progress states:

- Reading form
- Finding sections
- Finding questions
- Preparing plain-language guide

That gives confidence without depending on slow extraction.

### Requirement 17: Parser and Serializer

Technically good, but not important for the hackathon demo unless already implemented.

Recommendation:

- Use Zod validation for schema loading.
- Add one smoke test or runtime validation.
- Do not spend time on property-based tests unless the core UI is complete.

## Design Document Critique

### Extraction Pipeline Is Too Ambitious

The dual-path extraction architecture is product-correct but demo-risky:

- PDF.js text extraction,
- page image rendering,
- OpenAI vision layout extraction,
- merge strategy,
- schema enrichment,
- fallback paths.

This is too much to rely on with 5 hours left.

Recommended design rewrite:

```text
Primary demo path:
Demo PDF -> pre-seeded Form_Schema -> PDF render + overlays -> interview/review workflow

Fallback upload path:
Uploaded PDF -> render PDF -> optional best-effort extraction -> low-confidence overlays or demo prompt
```

### Data Model Is Mostly Good

The core types are appropriate. A few changes:

- Add `questionId` or `profileKey` to `FormField`.
- Add `requiredForDemo: boolean` if only some fields count toward completion.
- Add `statusReason` for user-facing explanations like “Needs proof of income.”
- Consider `DocumentRequirement.status = 'needed' | 'present'` instead of `uploaded`.
- Add `languageContent` or `translations` for pre-seeded Spanish copy.

### Derived State Should Stay Derived

The design stores:

- field statuses,
- issues,
- document checklist,
- completion percentage,
- suggested next step.

Be careful with duplicated state. The source of truth should be:

- schema,
- application profile,
- document status map.

Everything else should be derived or recomputed.

## Recommended 5-Hour Build Plan

### Priority 1: Reliable Demo Core

- Render SAWS 2 PLUS PDF.
- Load pre-seeded schema.
- Show overlays on 15-25 important fields.
- Click field to open explanation panel.

### Priority 2: Stateful Interview

- Add schema-driven interview questions.
- Update profile entries.
- Update field statuses.
- Persist to localStorage.

### Priority 3: Issues and Documents

- Implement deterministic contradiction rules.
- Generate document checklist.
- Let users mark documents as present.
- Recompute issues after changes.

### Priority 4: Review Screen

- Show completion score.
- Group missing/conflicting/needs-proof fields.
- Show next best action.
- Link back to field or question.

### Priority 5: AI Polish

- Use OpenAI for explanation regeneration or Spanish phrasing.
- Use Structured Outputs for any state-impacting result.
- Cache responses.

## Suggested Spec Edits

### Keep Product Name Consistent

Use `FormFlow` throughout PRD, design, UI copy, code comments, and demo script.

### Replace Generic Extraction Requirement

Current spirit:

```text
WHEN a PDF is uploaded, THE Extraction_Service SHALL identify sections and fields.
```

Recommended:

```text
WHEN the Demo_Form is loaded, THE Extraction_Service SHALL load the pre-seeded Form_Schema for the curated demo subset.

WHEN a non-demo PDF is uploaded, THE FormFlow_App SHALL render the PDF and MAY run best-effort extraction. If extraction confidence is low, THE FormFlow_App SHALL clearly indicate that only limited guidance is available and offer the Demo_Form.
```

### Replace Translation Requirement

Recommended:

```text
THE FormFlow_App SHALL support English and Spanish for pre-seeded demo explanations and guided interview questions.

Dynamic translation for arbitrary uploaded forms is a stretch goal.
```

### Clarify AI State Updates

Add:

```text
AI-generated responses SHALL NOT directly mutate application state. Any AI response that affects state SHALL be parsed through a strict schema and validated before use.
```

### Clarify Privacy Copy

Replace:

```text
no data is sent to external servers beyond AI processing
```

with:

```text
Your progress is saved only in this browser. When AI help is used, selected form text, page images, or answers may be sent for AI processing. No account is required.
```

## Demo Strategy

The live demo should emphasize:

1. The original SAWS 2 PLUS form is overwhelming.
2. FormFlow highlights the exact parts the user needs.
3. Clicking a field gives a plain-language explanation.
4. The assistant asks one simple question at a time.
5. Answers update the visual map.
6. The app catches a contradiction.
7. The app turns vague proof requirements into a checklist.
8. The final review shows what is ready and what needs attention.

This is enough to demonstrate the full product vision without needing production-grade arbitrary PDF extraction.

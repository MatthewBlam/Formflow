# FormFlow MVP PRD / Hackathon Build Spec

## 0. Locked MVP Decisions

These decisions reflect the current hackathon direction.

### Demo Form Recommendation

Primary demo form: **California SAWS 2 PLUS**

Link: https://www.dhcs.ca.gov/formsandpubs/laws/Documents/SPA%2013-022%20Attachment%202%20SAWS%202%20PLUS_FINAL%207%2024%2013%20ADA.pdf

Covers both **CalFresh** and **Medi-Cal**.

This web app can later scale to other complex government forms, including asylum, immigration, disaster relief, housing assistance, utility assistance, and fee waiver applications.

### Why this form?

- It is long and intimidating.
- It combines multiple benefits programs into one application.
- It includes household, income, expense, immigration/status-sensitive, and document-support sections.
- It is highly relevant to elderly, immigrant, non-native-English-speaking, and low-digital-literacy users.
- It gives the visual PDF map a strong wow factor because the raw form looks overwhelming.

### Implementation Note

Support only a curated subset of the form for the demo, such as:

- Applicant information
- Household information
- Income
- Expenses
- Signature/document requirements

### Backup Form

**USCIS Form I-912, Request for Fee Waiver**

Use this if the team wants a stronger immigrant-specific story.

---

## Final MVP Scope Choices

- Support both blank PDF upload and scanned/filled form upload.
- Do not require login.
- Use `localStorage` for demo persistence.
- Prioritize typed chat and visual UI first.
- Translation is included as a targeted feature, but voice is a stretch goal.
- The main UI is a visual PDF map with a chatbot/assistant side panel.
- The app does not need to fully export or submit the PDF.
- The app should produce:
  - guided answer packet
  - form-state map
  - issue list
  - document checklist
- Supporting document photo verification is optional/stretch.
- The MVP should instead generate a checklist and optionally let the user mark documents as present.

---

## Target User

Primary target user: **an elderly immigrant or non-native English speaker trying to understand and complete a complex public benefits form.**

Demo language: **Spanish** recommended, because it is easy to justify for California public benefits access and likely easy for judges to understand.

---

## Recommended Stack

### Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui

### PDF Rendering

- `react-pdf` or PDF.js

### Overlay Layer

- Absolute-positioned SVG or HTML `div` bounding boxes over the rendered PDF

### State Management

- Zustand or React Context

### Persistence

- `localStorage` via Zustand persist or a custom hook

### Backend

- Next.js API routes for fastest integration

### AI

OpenAI API for:

- explanations
- structured extraction
- translation
- chat

### OCR / Visual Extraction

#### Blank PDFs

- PDF.js text extraction
- `pdf-lib` for AcroForm fields, if applicable

#### Scanned/Filled Forms

- OpenAI vision for demo-friendly structured extraction
- AWS Textract is stronger for production but may be slower to integrate during the hackathon

### Optional PDF Export

- `pdf-lib`, only if time allows

---

# 1. Product Summary

## Product Name

**FormFlow**

## One-Line Pitch

FormFlow turns confusing government PDFs into an interactive visual guide, plain-language interview, and document-aware completion workflow for people who struggle with bureaucratic forms.

## Problem

Many people miss out on public benefits and government services not because they are ineligible, but because the application process is confusing, intimidating, jargon-heavy, and difficult to complete without assistance.

Elderly users, immigrants, caregivers, and low-digital-literacy applicants are especially affected.

Generic AI chat can answer questions about a PDF, but it does not provide a structured application workflow. Users still need to know what to ask, what fields are unfinished, what answers conflict, and what supporting documents are required.

## Solution

FormFlow analyzes an uploaded government form, creates a visual map of its sections and fields, explains confusing language in plain English, walks the user through required questions, tracks completion state, flags contradictions, and helps identify needed supporting documents.

## Core Differentiator

**ChatGPT can discuss a form. FormFlow operationalizes a form.**

FormFlow is not just a PDF chatbot. It provides:

- visual field mapping
- section-aware explanations
- guided intake questions
- persistent application state
- missing-field tracking
- contradiction detection
- supporting document checklist
- final review dashboard

---

# 2. Hackathon Goal

## Goal

Build a polished end-to-end MVP that demonstrates how AI, OCR/computer vision, and workflow design can make government forms easier to understand and complete.

## Success Criteria

By the demo, a user should be able to:

1. Upload a government form PDF.
2. See an interactive visual map of the PDF.
3. Click highlighted fields/sections for plain-language explanations.
4. Use an AI assistant to ask questions about the form.
5. Let the assistant ask simple intake questions back.
6. Populate a structured application profile.
7. Track which fields are complete, missing, inferred, or need confirmation.
8. Surface contradictions or confusing answers.
9. See a checklist of supporting documents needed.
10. Finish with a review screen showing readiness status.

---

# 3. Target User

## Primary Persona

**Maria, 67, non-technical applicant**

Maria received a benefits renewal form in the mail. She finds the form intimidating, does not understand terms like “gross income,” “household composition,” and “proof of residency,” and is unsure which documents she needs.

She may be helped by an adult child or community volunteer, but she wants to understand what she is submitting.

## User Needs

- Understand what each section means.
- Avoid accidentally answering inconsistently.
- Know which questions are required.
- Know what documents count as proof.
- Avoid retyping the same information repeatedly.
- Feel safe, respected, and not judged.
- Move one step at a time.

## Accessibility Principles

- Use plain language.
- Ask one question at a time.
- Use large text and high contrast.
- Avoid legalistic certainty.
- Never shame the user.
- Always allow editing and confirmation.
- Explain why information is being requested.
- Make progress visible.

---

# 4. MVP Scope

## Must-Have Features

### A. PDF Upload & Rendering

Users can upload a government form PDF. The app renders the PDF in-browser with page navigation.

#### Acceptance Criteria

- User can upload a PDF.
- PDF pages render clearly.
- App shows upload success/failure state.
- App can handle the selected demo form reliably.

---

### B. PDF Structure Extraction

The system extracts text, likely fields, sections, checkboxes, labels, and page coordinates where possible.

#### Acceptance Criteria

- App identifies major sections of the demo form.
- App identifies important fields/questions.
- Extracted elements are stored in a structured schema.
- Each extracted field has:
  - label
  - page number
  - approximate bounding box
  - status

---

### C. Visual Form Map

The app overlays highlights and labels directly on the PDF.

#### Acceptance Criteria

- Sections are visually highlighted.
- Important fields are labeled.
- Fields have status indicators:
  - missing
  - complete
  - needs confirmation
  - inferred
  - conflicting
- Clicking a field opens a detail panel.

---

### D. Plain-Language Explainer

Users can click a field or section and get a simple explanation.

#### Acceptance Criteria

Each field/section explanation includes:

- what this question means
- why the agency asks it
- example answer
- what documents may be needed
- common mistake to avoid, if applicable

---

### E. Guided Interview

The AI asks the user simple questions and maps answers to form fields.

#### Acceptance Criteria

- The assistant asks one question at a time.
- Questions use plain language.
- User answers update the application profile.
- Related PDF fields update status.
- User can revise prior answers.

---

### F. Application State Graph

The app tracks structured user answers and maps them to fields.

#### Acceptance Criteria

Each key answer stores:

- value
- source:
  - user chat
  - extracted document
  - manual edit
  - inferred
- confidence
- mapped field IDs
- status
- evidence requirement, if any

---

### G. Contradiction / Confusion Detection

The system flags likely inconsistencies.

#### Acceptance Criteria

The app can detect at least 3 demo contradictions, such as:

- user says unemployed but reports wages
- household count conflicts with listed members
- monthly income conflicts with uploaded or entered paystub amount
- form requires proof of address but no address document is present

---

### H. Supporting Document Checklist

The app generates a checklist of needed supporting documents based on form fields and user answers.

#### Acceptance Criteria

- Checklist updates dynamically.
- Items explain what counts as acceptable proof.
- Items are connected to relevant fields.
- User can mark documents as uploaded or still needed.

---

### I. Final Review Screen

Before completion, the app shows a readiness dashboard.

#### Acceptance Criteria

Dashboard includes:

- completion percentage
- completed sections
- missing fields
- conflicts to resolve
- supporting documents needed
- suggested next step

---

## Nice-to-Have Features

### Voice Input

Users can answer guided questions by speaking.

### Translation

Users can translate explanations into another language.

### Read-Aloud

The app can read explanations aloud.

### PDF Fill / Export

The system can generate a filled PDF or answer packet.

### Document Photo Verification

Users can upload a paystub, utility bill, or ID photo. The system classifies the document and checks whether required information appears present.

---

## Explicitly Out of Scope for MVP

- Automatically submitting forms to government agencies.
- Guaranteeing eligibility.
- Giving legal advice.
- Supporting every government form.
- Handling all jurisdictions.
- Complex account management.
- Fully secure production-grade case storage.
- Perfect OCR for all scans.

---

# 5. User Flow

## Flow 1: Upload and Analyze Form

1. User lands on homepage.
2. User clicks “Upload a form.”
3. User uploads PDF.
4. App processes PDF.
5. App displays summary:
   - number of pages
   - detected sections
   - detected fields
   - likely required fields
   - difficult terms found
6. App opens visual form map.

---

## Flow 2: Explore the Visual Form Map

1. User sees PDF with overlays.
2. User clicks highlighted field.
3. Side panel explains field in plain language.
4. User can click:
   - “Fill this with me”
   - “Show example”
   - “Why do they ask this?”
   - “What proof do I need?”

---

## Flow 3: Guided Interview

1. User clicks “Walk me through this.”
2. Assistant asks simple question.
3. User answers by typing.
4. App updates structured profile.
5. Relevant field changes from missing to complete or needs confirmation.
6. Assistant continues until required fields are covered.

---

## Flow 4: Resolve Issues

This flow is primarily for documents that are already filled out, not blank documents that are actively being filled out.

1. App detects contradiction or missing evidence.
2. App highlights issue on PDF and review panel.
3. Assistant asks clarification.
4. User confirms correct answer.
5. Field status updates.

---

## Flow 5: Final Review

1. User clicks “Review before submitting.”
2. App shows readiness dashboard.
3. User sees:
   - what is complete
   - what is missing
   - what needs proof
   - what may be inconsistent
4. User can export/copy an answer packet or proceed with manual submission.

---

# 6. Key Screens

## Screen 1: Landing Page

### Purpose

Make the value obvious and reduce anxiety.

### Core Copy

> Upload a government form. We’ll explain it in plain language and walk you through it one step at a time.

### Primary Actions

- Upload a PDF
- Try demo form

### Design Requirements

- large text
- high contrast
- minimal clutter
- reassuring tone

---

## Screen 2: Upload / Processing

### Purpose

Show progress and build trust.

### Elements

- file upload box
- processing steps
- privacy note
- error state

### Processing Labels

- Reading form
- Finding sections
- Finding questions
- Preparing plain-language guide

---

## Screen 3: Visual Form Map

### Purpose

Provide visual wow factor and practical navigation.

### Layout

- left: PDF viewer
- overlay: colored bounding boxes and labels
- right: assistant/detail panel
- top: progress bar
- bottom or side: issue count

### Field Colors

- gray: detected
- yellow: needs answer
- green: complete
- orange: needs confirmation
- red: conflict
- blue: explanation available

---

## Screen 4: Guided Interview

### Purpose

Simplify the form into human questions.

### Elements

- one question card at a time
- large answer box
- optional microphone button
- “I’m not sure” button
- “Why are you asking?” button
- linked PDF field preview

---

## Screen 5: Document Checklist

### Purpose

Turn vague proof requirements into concrete actions.

### Elements

- required document cards
- examples of acceptable proof
- status:
  - needed
  - uploaded
  - maybe valid
- upload button per document type

---

## Screen 6: Final Review

### Purpose

Give confidence before submission.

### Elements

- completion score
- section status
- unresolved issues
- document checklist
- suggested next step

---

# 7. Data Model

## FormDocument

```json
{
  "id": "form_001",
  "title": "Benefits Renewal Form",
  "pages": 6,
  "source_file_url": "...",
  "sections": [],
  "fields": []
}
```

## FormSection

```json
{
  "id": "section_income",
  "title": "Income Information",
  "plain_title": "Money coming into your household",
  "page_start": 2,
  "page_end": 3,
  "bbox": [0, 0, 0, 0],
  "summary": "This section asks about work, benefits, and other income."
}
```

## FormField

```json
{
  "id": "field_monthly_income",
  "section_id": "section_income",
  "label": "Gross monthly income",
  "plain_label": "Money you get each month before taxes",
  "page": 2,
  "bbox": [0, 0, 0, 0],
  "field_type": "currency",
  "required": true,
  "status": "missing",
  "value": null,
  "source": null,
  "confidence": null,
  "evidence_required": ["proof_of_income"]
}
```

## UserProfile / ApplicationProfile

```json
{
  "household_size": {
    "value": 3,
    "source": "user_chat",
    "confidence": 0.9,
    "mapped_fields": ["field_household_size"]
  },
  "monthly_income": {
    "value": 1200,
    "source": "user_chat",
    "confidence": 0.75,
    "mapped_fields": ["field_monthly_income"],
    "evidence_required": ["proof_of_income"]
  }
}
```

## Issue

```json
{
  "id": "issue_income_conflict",
  "type": "contradiction",
  "severity": "medium",
  "message": "You said you are unemployed, but also entered monthly wages.",
  "related_fields": ["field_employment_status", "field_monthly_income"],
  "suggested_question": "Are you currently working part-time, or was this income from a previous job?"
}
```

## DocumentRequirement

```json
{
  "id": "proof_of_address",
  "title": "Proof of address",
  "plain_explanation": "A document that shows your name and where you live now.",
  "examples": ["utility bill", "lease", "official letter"],
  "status": "needed",
  "related_fields": ["field_address"]
}
```

---

# 8. AI Behaviors

## System Behavior Principles

The AI should:

- speak plainly
- ask one question at a time
- explain jargon immediately
- avoid making eligibility guarantees
- show uncertainty
- map user answers to structured fields
- ask clarifying questions when answers conflict
- never shame or blame the user
- always let the user review before finalizing

---

## Assistant Modes

### Explainer Mode

Triggered when user clicks a field or asks “what does this mean?”

Output format:

- Simple meaning
- Why they ask
- Example answer
- What proof may help
- Common mistake

---

### Interview Mode

Triggered when user chooses “Walk me through it.”

Output format:

- one question
- why it matters, only if helpful
- expected answer type
- mapped field IDs

---

### Review Mode

Triggered near the end.

Output format:

- missing items
- contradictions
- document checklist
- suggested next step

---

### Jargon Translator Mode

Triggered when a complex term appears.

Output format:

- term
- plain meaning
- example
- related form section

---

# 9. Prompting / RAG Strategy

## Form Context

For each user question, retrieve:

- relevant field label
- section title
- nearby text
- page number
- detected instructions
- field status
- user profile facts mapped to that field

## Knowledge Context

Use a small curated knowledge base for the selected demo form/category:

- common terms
- form section explanations
- document requirements
- common mistakes
- example answers

## Guardrails

The assistant should not say:

- “You are definitely eligible.”
- “This is legal advice.”
- “You should submit this without reviewing.”
- “This guarantees approval.”

Preferred language:

- “This may apply to you.”
- “You should double-check this before submitting.”
- “This question usually means…”
- “Based on what you told me…”

---

# 10. Contradiction Rules for Demo

Implement deterministic rules for demo reliability.

## Rule 1: Employment vs Income

If `employment_status` is `unemployed` and `monthly_income_from_work > 0`, create issue.

## Rule 2: Household Size vs Member Count

If `household_size` does not equal number of listed household members, create issue.

## Rule 3: Address Proof Missing

If `address` is filled and `proof_of_address` requirement is not satisfied, create issue/checklist item.

## Rule 4: Income Proof Missing

If `income` is filled and `proof_of_income` requirement is not satisfied, create issue/checklist item.

## Rule 5: Signature Missing

If required signature field is detected and not marked complete, create issue.

---

# 11. Technical Architecture

## Suggested Stack

- Frontend: Next.js / React
- PDF rendering: PDF.js or `react-pdf`
- Overlay rendering: absolute-positioned bounding boxes over PDF canvas
- Backend: Next.js API routes
- Storage: local JSON / `localStorage`
- OCR / CV:
  - OpenAI vision for scanned/filled form extraction
  - PDF.js text extraction for blank PDFs
  - pre-seeded schema for demo reliability
- LLM: OpenAI for explanation, translation, structured extraction, and interview logic

## Pipeline

1. User uploads PDF.
2. App stores file locally for the session.
3. Extraction service parses text, fields, and coordinates where possible.
4. Form schema is generated or loaded from pre-seeded demo schema.
5. LLM enriches schema with plain-language labels and explanations.
6. Frontend renders PDF with overlay boxes.
7. User interacts with fields or assistant.
8. Assistant maps answers into application profile.
9. Rule engine updates field statuses and issues.
10. Review screen summarizes readiness.

## Fallback Strategy

If field extraction is unreliable, pre-seed schema for the demo form.

This is acceptable for hackathon if framed as:

- generic extraction pipeline exists
- demo form has curated schema for reliability
- scalable architecture supports additional form specs

---

# 12. Kiro Usage Plan

## Specs

Create Kiro specs for:

1. PDF ingestion and extraction
2. visual form map overlay
3. plain-language field explainer
4. guided interview flow
5. application state graph
6. contradiction detection
7. review dashboard

## Steering Docs

Create steering docs for:

- accessibility and low-digital-literacy UX
- plain-language tone
- government-form safety boundaries
- AI response format rules
- frontend component design conventions

## Hooks

Create hooks for:

- running tests when form schema changes
- checking UI copy for complex terms
- generating demo fixtures from schema
- validating that required field statuses are covered

## MCP / Powers

Potential uses:

- integrate docs or issue tracking
- use a design/linting workflow
- package domain-specific form assistance behavior into a reusable Kiro power

## Kiro Writeup Angle

Kiro was used not just for code generation, but to enforce a structured development workflow:

- specs decomposed the problem into stable subsystems
- steering kept AI outputs accessible and non-legalistic
- hooks automated regression checks for form schema and copy quality
- the team iterated between vibe coding for UI exploration and spec-driven development for core logic

---

# 13. Demo Script Outline

## Demo Length

Target: **2:30 minutes**

## Scene 1: Problem

“Government benefits exist, but forms are often the barrier. FormFlow helps users who do not speak bureaucracy.”

## Scene 2: Upload

Upload demo benefits form. Show processing steps.

## Scene 3: Visual Map

Show highlighted PDF sections and fields. Click confusing income field. Explain plain language.

## Scene 4: Guided Interview

Assistant asks simple questions. User answers. Fields update live.

## Scene 5: Contradiction

User uploads or analyzes a filled-out scan. App flags issue and asks clarifying question.

## Scene 6: Document Checklist

App shows proof of address and proof of income requirements.

## Scene 7: Final Review

Show readiness dashboard and remaining actions.

## Closing Line

“FormFlow does not just answer questions about a form. It turns the form into a guided, visual, accessible workflow.”

---

# 14. Implementation Milestones

## Hour 0-1: Scope Lock

- Choose demo form.
- Choose target persona.
- Decide voice/translation yes/no.
- Define demo data.

## Hour 1-3: Core Data Model & PDF Viewer

- Upload form.
- Render PDF.
- Define schema for demo form.
- Display overlays.

## Hour 3-5: Explainer + Chat Panel

- Click field to get explanation.
- Basic AI chat with form context.
- Plain-language response format.

## Hour 5-7: Guided Interview + State Updates

- Ask questions.
- Save answers.
- Map answers to fields.
- Update field statuses.

## Hour 7-9: Contradictions + Checklist

- Implement deterministic contradiction rules.
- Implement document requirements.
- Add review dashboard.

## Hour 9-10: Visual Polish

- Better overlay labels.
- Progress indicators.
- Accessibility UI pass.

## Hour 10-11: Kiro Repo + Writeup Assets

- Ensure `/.kiro` directory is committed.
- Add specs, steering, hooks.
- Write Kiro usage notes.

## Hour 11-12: Demo Recording

- Run through exact script.
- Fix critical bugs only.
- Record video under 3 minutes.

---

# 15. Risks & Mitigations

## Risk: PDF extraction is unreliable

Mitigation: Use a pre-seeded schema for the demo form and explain the extraction pipeline architecture.

## Risk: Too similar to ChatGPT

Mitigation: Emphasize visual form map, state tracking, contradiction detection, and document checklist.

## Risk: Scope too broad

Mitigation: Support one form category very well.

## Risk: Legal/eligibility concerns

Mitigation: Avoid guarantees. Present as guidance and review support.

## Risk: Accessibility is superficial

Mitigation: Build one-question-at-a-time UX, large text, plain-language explanations, and review controls.

---

# 16. Final MVP Definition

The MVP is successful if a judge can watch the demo and understand:

1. The app solves a real last-mile barrier in access to public services.
2. The PDF becomes visual, interactive, and understandable.
3. The AI does more than chat: it tracks progress, detects issues, and guides completion.
4. The system is designed for elderly, foreign, and low-digital-literacy users.
5. The architecture can scale to more forms through reusable form specs.
6. Kiro was used strategically across specs, steering, hooks, and development workflow.

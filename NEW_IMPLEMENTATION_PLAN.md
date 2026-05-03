# BridgeForm MVP Restructure Plan

## Goal

Restructure the app around a split-screen form assistant experience. The left side should handle form input, status, progress, and answer packet output. The right side should be a conversational assistant that can guide the user, answer questions, and check existing answers.

The MVP should avoid live document search, PDF writing, advanced OCR dependencies, and real-time PDF highlighting. Static demo forms and deterministic form context should drive the experience.

## 1. New App Shape

Use `/form` as the main workspace.

Left side:

- PDF upload
- Static demo form selector
- Blank vs filled status
- Progress tracker
- Current section and remaining items
- Answer packet preview
- Optional compact PDF preview

Right side:

- Conversational assistant
- Text-first chat interaction
- Optional manual voice input
- Mode switching between walkthrough, Q&A, and check

Current pieces to reuse:

- `app/form/page.tsx`
- `store/form-store.ts`
- `components/panel/*`
- `components/pdf/*`
- `app/api/extract`

Current pieces to reduce:

- The PDF viewer should become optional or contextual, not the primary workspace. Since the MVP has no PDF highlighting or editing, the PDF can sit behind a "Preview form" toggle or compact panel.

## 2. Data Model

Add explicit state for assistant workflow and form source handling.

```ts
type AssistantMode = 'walkthrough' | 'qa' | 'check';

type UploadKind = 'blank' | 'filled' | 'unknown';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}
```

Extend the store with:

```ts
activeMode: AssistantMode;
selectedDemoFormId: string | null;
uploadKind: UploadKind;
uploadKindConfidence: number;
chatMessages: ChatMessage[];
currentFieldId: string | null;
checkIssues: Issue[];
```

Keep the existing state where it still fits:

- `formSchema`
- `applicationProfile`
- `documentStatusMap`
- `activeFieldId`
- `currentPage`

The assistant mode and current field should become the main drivers of the interaction. Tabs should no longer drive the core workflow.

## 3. Static Demo Forms

Create a static form registry:

```txt
lib/forms/
  registry.ts
  saws2plus.ts
```

Each supported form should include:

- Form metadata
- PDF URL
- Static field schema
- Section order
- Plain-language field explanations
- Example answers
- Document requirements
- Optional validation and consistency rules

Demo form selection should load this context directly. This keeps the MVP deterministic and avoids pretending the app has live search or OCR.

## 4. Upload And Blank/Filled Detection

Support two input paths:

- Select a predefined demo form
- Upload a PDF

For uploaded PDFs, add a basic heuristic for blank vs filled detection:

- If extracted text contains likely user-entered values beyond known template text, mark as `filled`.
- If extraction finds only template-like text, mark as `blank`.
- If the app cannot tell, mark as `unknown`.

Output:

```ts
uploadKind: 'blank' | 'filled' | 'unknown';
uploadKindConfidence: number;
```

Mode routing:

- `filled` upload defaults to check mode.
- `blank` upload defaults to guided walkthrough.
- `unknown` asks the user whether to start with walkthrough or check.

## 5. Workspace Components

Replace the current tab-heavy panel workflow with mode-aware workspace components.

Proposed structure:

```txt
components/workspace/
  form-workspace.tsx
  form-control-panel.tsx
  form-source-selector.tsx
  status-tracker.tsx
  answer-packet-preview.tsx
  optional-pdf-preview.tsx

components/assistant/
  assistant-panel.tsx
  chat-thread.tsx
  chat-composer.tsx
  mode-switcher.tsx
  voice-input-button.tsx
```

The left side should show operational status. The right side should handle conversation and user input.

## 6. Assistant Orchestration

Create a small deterministic assistant layer before making the UI more complex.

Proposed structure:

```txt
lib/assistant/
  modes.ts
  walkthrough.ts
  qa.ts
  check.ts
  answer-packet.ts
```

Core result type:

```ts
interface AssistantResult {
  message: string;
  updates?: ProfileEntry[];
  nextFieldId?: string;
  mode?: AssistantMode;
  issues?: Issue[];
}
```

Responsibilities:

- Generate assistant responses from current state and form context.
- Save normalized field-value pairs.
- Move walkthrough mode to the next field.
- Answer form questions from preloaded context.
- Run deterministic check rules.
- Return side effects in a structured format.

This keeps chat behavior out of React components and makes it easier to test.

## 7. Guided Walkthrough Mode

Walkthrough behavior:

1. Start at the first incomplete required field.
2. Explain what the field means.
3. Explain why it is being asked.
4. Provide an example answer when useful.
5. Ask the user for their answer.
6. Save the normalized answer as a field-value pair.
7. Advance to the next field.
8. Update progress tracking.

Use existing field data where possible:

- `plainLanguageLabel`
- `whyAsking`
- `exampleAnswer`
- `required`
- `options`

## 8. Q&A Mode

Q&A should handle free-form questions without automatically mutating answers unless the user clearly gives an answer.

Supported question types:

- General form questions
- Specific field clarification
- Document requirement questions
- Section-level questions
- "Can I leave this blank?"
- "Where do I find this number?"

Responses should include:

- Short answer
- Related field or section
- Whether the user needs to take action

The response should come from static form context and known user answers.

## 9. Check Mode

Check mode should be triggered by:

- Filled upload detection
- User clicking a check/review action
- User asking the assistant to review answers

Checks should identify:

- Missing required fields
- Suspicious values
- Inconsistent values
- Conflicting answers
- Missing document requirements

Start with deterministic rules in the static form config. Avoid LLM-only validation for MVP.

Check mode should let the user:

- Review issues
- Accept suggested corrections
- Jump back into walkthrough
- Ask follow-up questions in Q&A mode

## 10. Progress Tracking

The left-side status tracker should show:

- Completed fields
- Current section
- Remaining required fields
- Missing documents
- Check issues

No PDF highlighting is needed for MVP.

Progress can continue using existing selectors such as:

- `getFieldStatusMap`
- `getCompletionPercentage`

Add selectors for:

- Current section
- Remaining required fields
- Answer packet sections
- Check issue count

## 11. Answer Packet

Generate an answer packet from `applicationProfile`, `formSchema`, and `documentStatusMap`.

Structure:

```txt
Section name
- Field label: Answer
- Missing: Field label

Documents
- Present: Document name
- Needed: Document name

Issues
- Issue message
- Suggested correction
```

For MVP, the answer packet is a structured summary in the UI. Do not write answers into the PDF.

## 12. Voice Input

Voice input is optional and manual only.

Behavior:

- User clicks mic button.
- App records speech.
- App shows speech-to-text preview.
- User confirms before sending.
- No automatic listening.
- No automatic sending.

Keep voice handling isolated inside `ChatComposer` and `VoiceInputButton`.

## 13. Implementation Phases

### Phase 1: State And Static Context

- Add assistant mode state.
- Add chat message state.
- Add demo form registry.
- Add upload kind state.
- Add answer packet selector.
- Keep existing extraction flow working.

### Phase 2: Layout Restructure

- Convert `/form` into a left control/status pane and right assistant pane.
- Move PDF viewer into an optional preview.
- Replace panel tabs with mode-aware workspace UI.

### Phase 3: Assistant MVP

- Implement walkthrough mode.
- Implement Q&A mode from static form context.
- Save answers into `applicationProfile`.
- Advance current field after answers.

### Phase 4: Check Mode

- Add blank/filled routing.
- Add deterministic issue generation.
- Show check issues in status tracker and assistant.
- Support correction flow.

### Phase 5: Voice Input

- Add manual mic button.
- Add speech-to-text preview.
- Send only after user confirmation.

## Recommended First Cut

Start by replacing `PanelContainer` with a new `FormWorkspace` and `AssistantPanel`, while keeping the existing store and field schema mostly intact.

This gives the product the new BridgeForm shape without rewriting extraction, tests, or the PDF layer all at once.

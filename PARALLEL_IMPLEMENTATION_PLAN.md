# BridgeForm Parallel Implementation Plan

## Goal

Split the BridgeForm restructure into four parallel workstreams that can be implemented at the same time with minimal merge conflicts.

The main coordination rule is that each person owns a mostly separate file area. Shared types and store changes should happen first or be coordinated through a small shared PR.

## Team Split

## Person 1: State, Types, And Static Form Context

### Ownership

Primary files:

- `formflow/types/index.ts`
- `formflow/store/form-store.ts`
- `formflow/store/selectors.ts`
- `formflow/lib/forms/*`
- `formflow/lib/constants.ts`

Tests:

- `formflow/store/form-store.test.ts`
- `formflow/store/selectors.test.ts`
- New tests for static form registry

### Responsibilities

Create the data foundation for the new BridgeForm workflow.

Add shared types:

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

Extend store state with:

- `activeMode`
- `selectedDemoFormId`
- `uploadKind`
- `uploadKindConfidence`
- `chatMessages`
- `currentFieldId`
- `checkIssues`

Add store actions:

- `setActiveMode`
- `setSelectedDemoFormId`
- `setUploadKind`
- `appendChatMessage`
- `setChatMessages`
- `setCurrentFieldId`
- `setCheckIssues`
- `resetSession`

Create static form registry:

```txt
formflow/lib/forms/
  registry.ts
  saws2plus.ts
```

Each form entry should include:

- Form metadata
- PDF URL
- Static schema
- Field explanations
- Document requirements
- Optional check rules

Add selectors for:

- Current section
- Remaining required fields
- Completed required fields
- Answer packet sections
- Check issue count
- First incomplete required field

### Deliverables

- Store supports assistant mode, messages, upload detection state, and current field state.
- Static demo form can be selected by ID.
- Answer packet data can be generated from selectors.
- Existing tests still pass, with new tests for the added selectors.

### Coordination Notes

This workstream should land first if possible. Other workstreams can mock these types temporarily, but the final merge should use the real exported types and selectors from this work.

## Person 2: Workspace Layout And Left-Side Controls

### Ownership

Primary files:

- `formflow/app/form/page.tsx`
- `formflow/components/workspace/*`
- `formflow/components/pdf/*`
- `formflow/components/landing/*` only if needed for navigation into the new workspace

Tests:

- New workspace component tests
- Existing PDF/control tests if touched

### Responsibilities

Restructure `/form` into the new split-screen product workspace.

Create:

```txt
formflow/components/workspace/
  form-workspace.tsx
  form-control-panel.tsx
  form-source-selector.tsx
  status-tracker.tsx
  answer-packet-preview.tsx
  optional-pdf-preview.tsx
```

Left side should include:

- Demo form selector
- PDF upload entry point
- Blank/filled/unknown status
- Current mode indicator
- Current section
- Completed field count
- Remaining required fields
- Missing documents
- Check issue count
- Answer packet preview
- Optional PDF preview toggle

Update `/form` so it renders:

- Left: `FormControlPanel`
- Right: assistant panel placeholder from Person 3

The PDF viewer should no longer dominate the page. Keep it available as an optional preview.

### Deliverables

- `/form` has the new split-screen layout.
- Left panel works with real or stubbed store values.
- PDF preview remains usable but secondary.
- The layout is responsive enough for laptop-width development demos.

### Coordination Notes

Avoid changing assistant internals. Use the public props/API from Person 3's `AssistantPanel`, or temporarily render a placeholder component until that work lands.

Avoid editing store logic beyond wiring actions and selectors created by Person 1.

## Person 3: Conversational Assistant UI And Interaction Flow

### Ownership

Primary files:

- `formflow/components/assistant/*`
- `formflow/lib/assistant/*`

Tests:

- Assistant orchestration tests
- Chat UI behavior tests

### Responsibilities

Build the assistant side of the split-screen workspace.

Create UI components:

```txt
formflow/components/assistant/
  assistant-panel.tsx
  chat-thread.tsx
  chat-composer.tsx
  mode-switcher.tsx
  voice-input-button.tsx
```

Create assistant logic:

```txt
formflow/lib/assistant/
  modes.ts
  walkthrough.ts
  qa.ts
  check.ts
  answer-packet.ts
```

Implement shared assistant result:

```ts
interface AssistantResult {
  message: string;
  updates?: ProfileEntry[];
  nextFieldId?: string;
  mode?: AssistantMode;
  issues?: Issue[];
}
```

Assistant behavior:

- Render chat messages.
- Let user submit text messages.
- Let user switch modes manually.
- In walkthrough mode, ask for the next incomplete field.
- Save answers into `applicationProfile`.
- In Q&A mode, answer from static form context.
- In check mode, show issues generated by the check engine.

Voice input MVP:

- Add manual mic button.
- Show speech-to-text preview before sending.
- Do not auto-send.
- Keep voice code isolated inside `VoiceInputButton` and `ChatComposer`.

If browser speech APIs are not reliable in test environments, gate them behind feature detection and provide a disabled state.

### Deliverables

- Assistant panel can drive walkthrough mode end to end.
- Q&A mode can answer static context questions.
- Check mode can display issues.
- Chat messages persist in the store.
- Manual voice input UI exists, even if browser support is limited.

### Coordination Notes

Do not own page layout. Person 2 owns where the assistant appears.

Do not own static form source definitions. Person 1 owns those; use exported registry/context APIs.

## Person 4: Upload Detection, Check Mode Rules, And Integration Tests

### Ownership

Primary files:

- `formflow/app/api/extract/route.ts`
- `formflow/lib/upload-detection/*`
- `formflow/lib/checks/*`
- `formflow/app/page.tsx` if needed for upload/demo routing
- Integration-style tests around upload/check flows

Tests:

- `formflow/app/api/extract/route.test.ts`
- New upload detection tests
- New check rule tests
- New high-level flow tests where practical

### Responsibilities

Implement the MVP detection and check logic.

Create:

```txt
formflow/lib/upload-detection/
  detect-upload-kind.ts

formflow/lib/checks/
  run-checks.ts
  rules.ts
```

Blank/filled detection should return:

```ts
interface UploadDetectionResult {
  kind: 'blank' | 'filled' | 'unknown';
  confidence: number;
  reasons: string[];
}
```

MVP heuristic:

- Uploaded PDFs with likely user-entered values beyond known template text are `filled`.
- Uploaded PDFs with only template-like text are `blank`.
- Unclear results are `unknown`.

Mode routing:

- `filled` upload sets mode to `check`.
- `blank` upload sets mode to `walkthrough`.
- `unknown` prompts the user to choose.

Check mode rules should identify:

- Missing required fields
- Missing required documents
- Suspicious values
- Inconsistent values
- Conflicting answers

Start deterministic. Do not add advanced OCR or live search.

### Deliverables

- Upload path records blank/filled/unknown status.
- Filled uploads route into check mode.
- Blank uploads route into walkthrough mode.
- Check rules produce `Issue[]`.
- Tests cover detection and rule behavior.

### Coordination Notes

Person 4 will depend on shared types from Person 1. Keep detection and check logic in separate library files so Person 3 can call it without importing API route code.

## Shared Integration Contract

All workstreams should align around these shared concepts:

```ts
type AssistantMode = 'walkthrough' | 'qa' | 'check';
type UploadKind = 'blank' | 'filled' | 'unknown';
```

Store should be the source of truth for:

- Current form schema
- Selected demo form
- Uploaded PDF URL
- Upload kind
- Active assistant mode
- Current field
- Chat messages
- Saved field answers
- Document status
- Check issues

Static form registry should be the source of truth for:

- Supported demo forms
- Form-specific field explanations
- Form-specific document requirements
- Form-specific validation/check metadata

## Suggested Branches

- `feature/state-form-context`
- `feature/workspace-layout`
- `feature/assistant-panel`
- `feature/upload-check-mode`

## Merge Order

Recommended order:

1. Person 1: state, types, registry, selectors
2. Person 2: workspace layout
3. Person 3: assistant UI and orchestration
4. Person 4: upload detection and check rules
5. Final integration pass

Parallel development can still start immediately. If Person 1 is not merged yet, the others should use temporary local types and remove them before merging.

## Conflict Avoidance Rules

- Only Person 1 edits `types/index.ts` and `store/form-store.ts` unless coordinated.
- Only Person 2 edits `/form` layout as the source of truth.
- Only Person 3 edits assistant components and assistant orchestration.
- Only Person 4 edits upload detection and check rule internals.
- Avoid broad formatting-only changes.
- Avoid moving existing files unless your workstream explicitly owns the move.
- Keep PRs small enough that the final integration pass can reason about them.

## Final Integration Checklist

- `/form` opens to the split-screen workspace.
- Demo form selection loads static form context.
- PDF upload sets blank/filled/unknown status.
- Blank forms enter walkthrough mode.
- Filled forms enter check mode.
- User can ask free-form Q&A questions.
- User can complete fields through chat.
- Progress tracker updates as answers are saved.
- Answer packet preview reflects saved answers and missing requirements.
- Check mode reports deterministic issues.
- Existing tests pass.
- New tests cover state, selectors, assistant orchestration, upload detection, and check rules.


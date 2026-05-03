# BridgeForm Project Context

## Current Direction

The app has pivoted from a PDF-first field viewer to a split-screen form assistant.

- `/form` is the main workspace.
- The left pane handles form source, status, progress, document reminders, answer packet output, and optional PDF preview.
- The right pane is a deterministic conversational assistant with walkthrough, Q&A, and check modes.
- Static demo context drives the SAWS 2 PLUS path. The demo no longer depends on live extraction.
- Uploaded PDFs still use `/api/extract` as a best-effort fallback and are classified as `blank`, `filled`, or `unknown`.
- Uploaded PDF extraction results are cached in browser localStorage by SHA-256 document hash.
- The MVP does not write answers into PDFs, perform live document search, or render field highlights.

## Implementation Map

- `types/index.ts`: shared state, schema, assistant, chat, upload, and issue types.
- `store/form-store.ts`: persisted Zustand source of truth.
- `store/selectors.ts`: derived progress, issues, remaining fields, current section, and answer packet.
- `lib/forms/registry.ts`: static demo form registry.
- `lib/forms/saws2plus.ts`: SAWS 2 PLUS static schema, document requirements, and check rules.
- `lib/assistant/*`: deterministic walkthrough, Q&A, check, and answer packet logic.
- `lib/extraction-cache.ts`: browser-side PDF fingerprinting and extraction-result cache.
- `components/workspace/*`: left operational workspace.
- `components/assistant/*`: right assistant panel, chat thread, composer, and mode switcher.
- `components/pdf/*`: retained for optional PDF preview.
- `app/api/extract/route.ts`: OpenAI extraction fallback for uploaded PDFs, plus blank/filled heuristic.

## Product Guardrails

- No eligibility guarantees.
- No legal advice framing.
- No recommendation to submit without review.
- Voice input is not part of the current MVP.
- Answer packet is a structured UI summary only; it does not write into the PDF.

## Verification Baseline

Use these checks before handing off substantial changes:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

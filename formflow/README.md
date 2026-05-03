# BridgeForm

BridgeForm is a Next.js MVP for guided government form completion. The current app centers on `/form`, with a split workspace:

- Left: form source selection, upload status, progress, document status, answer packet, and optional PDF preview.
- Right: conversational caseworker-style assistant for questions, guided answers, and checks.

The demo path loads static SAWS 2 PLUS context from `lib/forms/registry.ts` instead of calling live extraction. Uploaded PDFs still use `/api/extract` as a best-effort path and receive a blank/filled/unknown classification.

Uploaded PDF extraction results are cached in browser localStorage by SHA-256 hash of the PDF bytes, so re-uploading the same document can skip the expensive extraction call.

## Development

Create a local environment file when testing uploads:

```bash
cp .env.local.example .env.local
```

Set `OPENAI_API_KEY` in `.env.local` for `/api/extract`. The demo form does not require an API key.

Run the app:

```bash
npm run dev
```

Run checks:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## Key Files

- `app/page.tsx` loads the static demo or processes PDF uploads.
- `app/form/page.tsx` renders the BridgeForm workspace.
- `components/workspace/*` owns the left operational pane.
- `components/assistant/*` owns chat, composer, and the check action.
- `lib/forms/*` contains deterministic demo form context and check rules.
- `lib/assistant/*` contains caseworker chat, field Q&A, check, and answer packet logic.
- `lib/extraction-cache.ts` fingerprints uploaded PDFs and caches extraction results.
- `store/form-store.ts` is the persisted Zustand source of truth.

# Project Structure

## Root Layout

```
formflow/
├── app/                        # Next.js App Router pages and route handlers
│   ├── page.tsx                # Landing page
│   ├── layout.tsx              # Root layout
│   ├── form/
│   │   ├── page.tsx            # FormWorkspace (PDF viewer + side panel)
│   │   └── review/
│   │       └── page.tsx        # Review dashboard
│   └── api/
│       ├── explain/route.ts    # POST /api/explain
│       ├── normalize-answer/route.ts
│       ├── translate/route.ts
│       └── extract/route.ts    # Fallback only — demo bypasses this
├── components/                 # Reusable UI components
│   ├── ui/                     # shadcn/ui primitives (managed via shadcn MCP, preset b3963UvzV)
│   ├── PdfViewer.tsx
│   ├── FieldOverlay.tsx
│   ├── OverlayLayer.tsx
│   ├── ExplainerPanel.tsx
│   ├── InterviewCard.tsx
│   ├── DocumentCard.tsx
│   ├── DocumentChecklist.tsx
│   ├── IssueCard.tsx
│   ├── ProgressBar.tsx
│   ├── LanguageToggle.tsx
│   ├── ProcessingSteps.tsx
│   └── FileUpload.tsx
├── lib/
│   ├── types/                  # TypeScript interfaces
│   │   ├── schema.ts           # FormSchema, FormSection, FormField, BoundingBox, FieldStatus, AnswerSource
│   │   ├── profile.ts          # ProfileEntry, Issue, DocumentRequirement
│   │   ├── interview.ts        # InterviewQuestion, InterviewSession, ExplainerContent
│   │   └── session.ts          # SessionState, PersistedState
│   ├── schemas/                # Zod validation schemas (mirrors lib/types/)
│   ├── state/
│   │   ├── store.ts            # Zustand store (FormFlowStore)
│   │   └── profileActions.ts   # Answer-to-profile mapping functions
│   ├── interview/
│   │   └── engine.ts           # Schema-driven interview sequencing logic
│   ├── rules/
│   │   └── contradictions.ts   # Five deterministic contradiction rules
│   ├── checklist/
│   │   └── generator.ts        # Document checklist generator
│   ├── schema/
│   │   └── serializer.ts       # FormSchema parse/serialize with Zod
│   ├── ai/
│   │   └── client.ts           # Shared OpenAI client, system prompts, retry logic
│   └── ui/
│       └── statusColors.ts     # FieldStatus → color mapping
├── public/
│   └── schemas/
│       └── saws-2-plus.json    # Pre-seeded SAWS 2 PLUS demo form schema
├── __tests__/                  # Vitest + fast-check property tests
└── .kiro/
    ├── specs/bridgeform-mvp/   # Spec documents (requirements, design, tasks)
    └── steering/               # These steering files
```

## Key Conventions

**Types vs Schemas:** TypeScript interfaces live in `lib/types/`. Matching Zod schemas for runtime validation live in `lib/schemas/`. Keep them in sync.

**Derived state is never stored.** The Zustand store holds only `formSchema`, `applicationProfile`, `documentStatusMap`, and session metadata. Field status maps, issues, completion percentage, and suggested next steps are computed by selector functions (`getFieldStatusMap()`, `getIssues()`, etc.) and recomputed on every load.

**AI calls are server-side only.** All OpenAI calls go through route handlers in `app/api/`. The `OPENAI_API_KEY` env var must never be exposed to the client.

**Demo path vs upload path.** The demo form loads `public/schemas/saws-2-plus.json` directly — no extraction, no API call. The upload path calls `/api/extract` as a best-effort fallback. Never mix these paths.

**Route Handlers, not API Routes.** All server endpoints follow the App Router convention: `app/api/[name]/route.ts` exporting named HTTP method functions (`POST`, `GET`, etc.).

**Bounding boxes are page-percentage coordinates.** `BoundingBox.x`, `.y`, `.width`, `.height` are all 0–100 representing percentage of page dimensions, not pixels.

**shadcn/ui components live in `components/ui/`.** Always add new shadcn primitives using the shadcn MCP — never copy component source manually. Custom composite components that wrap shadcn primitives go in `components/` (not `components/ui/`).

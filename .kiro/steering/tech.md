# Tech Stack

## Framework & Language
- **Next.js 14+** with App Router (`app/` directory)
- **TypeScript** throughout — no plain JS files
- Server-side logic lives in **Route Handlers** at `app/api/*/route.ts` (not "API routes" — that's the Pages Router term)

## UI
- **Tailwind CSS** for styling
- **shadcn/ui** for accessible component primitives
  - Use the **shadcn MCP** to scaffold and look up components — it is configured in `.kiro/settings/mcp.json`
  - Always use the MCP to add new shadcn components rather than copying them manually
  - Components are installed into `components/ui/` via the MCP
  - Project style preset: `b3963UvzV` (luma style, zinc base, indigo theme) — apply with `npx shadcn@latest apply b3963UvzV` on project init
- Minimum font sizes: 16px body, 20px headings
- Minimum color contrast: 4.5:1 (WCAG 2.1 AA)

## PDF Rendering
- **react-pdf** (PDF.js wrapper) for in-browser PDF rendering
- PDF.js worker must be configured for Next.js App Router
- Uploaded PDFs stay client-side as Blob URLs — never stored server-side for the demo path

## State Management
- **Zustand** with persist middleware
- localStorage key: `formflow-session`
- Only source-of-truth data is persisted: `formSchema`, `applicationProfile`, `documentStatusMap`, session metadata
- Derived state (issues, completion %, field status map, suggested next step) is **recomputed on load**, never persisted

## Validation
- **Zod** for all runtime schema validation — used on both client and server
- All AI responses that affect state must pass Zod validation before touching Zustand

## AI
- **OpenAI API** — server-side only via `OPENAI_API_KEY` env var
- Default model: `gpt-5.4-mini` (explainer, interview phrasing, answer normalization, Spanish)
- Stretch model: `gpt-5.5` (complex one-shot document reasoning only)
- Budget option: `gpt-5.4-nano` (high-volume simple tasks if cost matters)
- Use **Structured Outputs** (not JSON mode) for all state-impacting responses

## Testing
- **Vitest** as the test runner
- **fast-check** for property-based tests
- **@testing-library/react** for component tests
- **msw** for mocking API routes in tests

## Common Commands

```bash
# Development server (run manually in terminal)
npm run dev

# Run tests (single pass, no watch mode)
npx vitest --run

# Type check
npx tsc --noEmit

# Build
npm run build

# Lint
npm run lint
```

## Environment Variables

```
OPENAI_API_KEY=   # Required for AI route handlers (server-side only)
```

## Key Dependencies

| Package | Purpose |
|---|---|
| `react-pdf` | PDF rendering |
| `zustand` | State management + localStorage persist |
| `zod` | Runtime schema validation |
| `openai` | OpenAI API client |
| `vitest` | Test runner |
| `fast-check` | Property-based testing |
| `@testing-library/react` | Component testing |
| `msw` | API mocking in tests |

## MCP Servers

| Server | Preset | Purpose |
|---|---|---|
| `shadcn` (MCP) | `b3963UvzV` | Scaffold shadcn/ui components, look up component APIs, and add components to `components/ui/` |

The shadcn MCP is configured in `.kiro/settings/mcp.json`. Use it whenever adding or referencing shadcn/ui components during implementation.

The preset `b3963UvzV` (luma style, zinc base, indigo theme) is applied at project init time via `npx shadcn@latest apply b3963UvzV` — it is **not** a flag passed to the MCP server.

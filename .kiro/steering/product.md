# FormFlow — Product Summary

FormFlow is an AI-powered web app that transforms complex government PDF forms into interactive, guided completion workflows. It targets elderly immigrants, non-native English speakers, and low-digital-literacy users who struggle with bureaucratic forms.

## Core Value Proposition

"ChatGPT can discuss a form. FormFlow operationalizes a form."

The app provides:
- Visual PDF map with colored field overlays showing completion status
- Plain-language field explanations (click any field to understand it)
- Schema-driven guided interview (one question at a time)
- Persistent application state tracking
- Contradiction and missing-evidence detection
- Supporting document checklist
- Final review dashboard

## Demo Form

Primary demo: **California SAWS 2 PLUS** (CalFresh + Medi-Cal)
Pinned URL: `https://www.dhcs.ca.gov/formsandpubs/laws/Documents/SPA%2013-022%20Attachment%202%20SAWS%202%20PLUS_FINAL%207%2024%2013%20ADA.pdf`

The demo uses a **pre-seeded schema** (`public/schemas/saws-2-plus.json`) covering 15–25 high-impact fields. Generic PDF extraction is a best-effort fallback, not the primary path.

## Out of Scope

- Form submission to government agencies
- Eligibility guarantees or legal advice
- Account management or authentication
- Full arbitrary PDF extraction (demo uses pre-seeded schema)
- PDF fill/export (stretch goal only)

## AI Safety Rules

The app must never:
- Guarantee eligibility for any program
- Present output as legal advice
- Recommend submitting without review

Always use hedging language: "This may apply to you," "You should double-check this," "Based on what you told me."

# Resume Reviewer — Claude Code Guide

## What this app does
AI-powered tool for bulk resume screening. Users upload a single PDF containing multiple resumes, provide a job description and custom scoring rubric, and Claude evaluates each candidate. Results are shown in an interactive table with filtering, sorting, and Excel export.

## Tech stack
- **Next.js 16** (App Router) — full-stack framework
- **React 19** — UI
- **TypeScript 5** — type safety
- **Tailwind CSS 3** — styling (utility classes + custom component classes in `globals.css`)
- **@anthropic-ai/sdk** — Claude API calls (server-only)
- **pdfjs-dist 4.9.x** — client-side PDF text extraction
- **xlsx 0.18.x** — Excel export

## Project structure
```
src/
  app/
    page.tsx                    # Root client component; 4-step wizard state machine
    layout.tsx                  # Root layout
    globals.css                 # Tailwind base + custom component classes
    api/process-resumes/route.ts # POST endpoint — SSE stream, calls Claude
  components/
    Step1_JobSetup.tsx          # Job description + rubric editor
    Step2_Upload.tsx            # PDF upload + client-side text extraction
    Step3_Processing.tsx        # SSE consumer, live progress UI
    Step4_Results.tsx           # Results table with sort/filter/expand
    StepIndicator.tsx           # Step nav indicator
  lib/
    types.ts                    # TypeScript interfaces + DEFAULT_RUBRIC
    excel.ts                    # downloadExcel() utility
```

## Architecture — how data flows
1. **Step 1**: User inputs job description + rubric (weights must sum to 100%). State lives in `page.tsx`.
2. **Step 2**: PDF uploaded in browser → `pdfjs-dist` extracts text page-by-page → `pages: string[]` passed up to `page.tsx`.
3. **Step 3**: `Step3_Processing` POSTs `{ pages, jobDescription, rubric }` to `/api/process-resumes` and reads the SSE stream.
4. **API route** (`route.ts`):
   - Phase 1 — sends page previews (first 150 chars each) to Claude → Claude returns `{ boundaries: [1, 4, 7...] }` (1-based page indices where new resumes start).
   - Phase 2 — builds resume text blocks from boundaries, batches them (5 at a time), calls Claude to score each → streams `progress` events with `batchResults`.
   - On completion sends `complete` event with sorted full results.
5. **Step 4**: Interactive results table; Excel download via `xlsx`.

## Key conventions
- All Claude calls use model `claude-sonnet-4-6`.
- SSE event shape defined in `SSEEvent` interface (`lib/types.ts`).
- `ResumeResult.rubricScores` keys are criterion **names** (not IDs) — must match exactly between Claude's response and `rubric[].name`.
- Rubric weights are percentages; overall score = weighted average of 0–10 criterion scores → 0–100.
- The API key is in `.env.local` as `ANTHROPIC_API_KEY`. Never commit this file.

## Running locally
```bash
npm install
npm run dev      # http://localhost:3000
```

## Known issues / watch areas
- **React key on fragments** (`Step4_Results.tsx` ~line 144): `filtered.map(...)` returns bare `<>` fragments — React 19 requires `<React.Fragment key={r.id}>` here or it will warn and potentially mis-render expanded rows.
- **SSE parsing** (`Step3_Processing.tsx`): splits buffer on `\n`, skips lines without `data: ` prefix — works correctly but is sensitive to chunking.
- **PDF worker CDN** (`Step2_Upload.tsx` line 31): uses `cdnjs.cloudflare.com` for `pdf.worker.min.mjs` — will fail in offline environments or if CDN is unavailable.
- **`next.config.js` turbopack**: `turbopack: {}` enables Turbopack in dev; some packages may behave differently under it.
- **API key exposure**: `.env.local` contains the live Anthropic key — keep out of version control.

## Deployment
- Target: Vercel (`vercel.json` sets `maxDuration: 300` for the API function).
- `serverExternalPackages: ['@anthropic-ai/sdk']` in `next.config.js` ensures the SDK stays server-side only.

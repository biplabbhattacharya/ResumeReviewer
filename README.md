# Resume Reviewer

AI-powered bulk resume screening. Upload a single PDF containing multiple resumes, define a weighted scoring rubric, and get every candidate evaluated and ranked by Claude — streamed in real time, exportable to Excel.

**No resume data is stored.** PDF text is extracted in your browser and sent directly to the AI API. Nothing is persisted on any server.

---

## Getting started

### 1. Get an API key

This app uses [Anthropic Claude](https://www.anthropic.com/) for AI scoring.

1. Sign up at [console.anthropic.com](https://console.anthropic.com/)
2. Go to **Settings → API Keys** and create a new key

### 2. Configure your environment

```bash
cp .env.local.example .env.local
```

Open `.env.local` and paste your key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## How it works

| Step | What happens |
|------|-------------|
| **1 · Job & Rubric** | Paste a job description and define weighted scoring criteria (must sum to 100 %) |
| **2 · Upload PDF** | Drop in a batch PDF — all resume text is extracted client-side in your browser |
| **3 · Processing** | Claude identifies individual resumes and scores each one against your rubric |
| **4 · Results** | Browse, filter, sort, and expand candidate details — download as Excel |

---

## Deployment (Vercel)

1. Fork this repo and import it into [Vercel](https://vercel.com/)
2. Add `ANTHROPIC_API_KEY` as an environment variable in the Vercel project settings
3. Deploy — `vercel.json` already sets the API function timeout to 300 s for large batches

---

## Tech stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript** · **Tailwind CSS**
- **@anthropic-ai/sdk** — Claude API (server-only)
- **pdfjs-dist** — client-side PDF text extraction
- **xlsx** — Excel export

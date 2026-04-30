import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { RubricCriteria, ResumeResult, SSEEvent } from '@/lib/types';

export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function sse(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Sends just the first ~150 chars of each page to Claude and asks it to identify
 * which pages start a new resume. Returns an array of page indices (0-based).
 */
async function findResumeBoundaries(pagePreviews: string[]): Promise<number[]> {
  const preview = pagePreviews
    .map((p, i) => `Page ${i + 1}: ${p.substring(0, 150).replace(/\n/g, ' ').trim()}`)
    .join('\n');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system:
      'You analyze PDF page previews to find where new resumes begin. Return ONLY valid JSON, no other text.',
    messages: [
      {
        role: 'user',
        content: `Below are the first 150 characters of each page from a PDF containing multiple resumes merged together.
Identify which page numbers (1-based) are the START of a new resume. A new resume typically begins with a candidate name, followed by contact info on the same or next line.

${preview}

Return JSON: {"boundaries": [1, 4, 7, ...]} — list of 1-based page numbers where each new resume starts.`,
      },
    ],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse resume boundaries from Claude response');
  const parsed = JSON.parse(match[0]) as { boundaries: number[] };
  return parsed.boundaries.map((b) => b - 1); // convert to 0-based
}

async function scoreBatch(
  resumes: string[],
  jobDescription: string,
  rubric: RubricCriteria[],
  startIndex: number,
): Promise<ResumeResult[]> {
  const rubricText = rubric
    .map((c) => `- ${c.name} (${c.weight}%): ${c.description}`)
    .join('\n');

  const resumeBlock = resumes
    .map((r, i) => `=== RESUME ${startIndex + i + 1} ===\n${r}`)
    .join('\n\n---\n\n');

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8096,
    system: `You are a senior recruiter and talent evaluator. Score resumes rigorously and fairly.
Return ONLY a valid JSON array — no markdown, no explanation, just the raw JSON array.`,
    messages: [
      {
        role: 'user',
        content: `JOB DESCRIPTION:
${jobDescription}

SCORING RUBRIC (weights sum to 100%):
${rubricText}

For each resume below, extract and score the candidate. Return a JSON array where each element has:
{
  "name": "Full Name",
  "email": "email or N/A",
  "phone": "phone or N/A",
  "location": "city, state/country or N/A",
  "yearsOfExperience": "e.g. 7 or ~5-7",
  "currentTitle": "most recent job title",
  "education": "Degree, Field, School",
  "keyStrengths": ["strength 1", "strength 2", "strength 3"],
  "keyWeaknesses": ["weakness 1", "weakness 2"],
  "overallScore": 82,
  "rubricScores": {"Technical Skills": 8, "Relevant Experience": 7, ...},
  "rubricComments": {"Technical Skills": "Strong Python and ML background", ...},
  "recommendation": "Yes",
  "summary": "2-3 sentence overall evaluation."
}

recommendation must be one of: "Strong Yes", "Yes", "Maybe", "No"
overallScore = weighted average of rubricScores using the rubric weights.

RESUMES TO SCORE:
${resumeBlock}`,
      },
    ],
  });

  const text = msg.content[0].type === 'text' ? msg.content[0].text : '[]';
  // Extract JSON array from response (handles any leading/trailing text)
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('Could not parse scored resumes from Claude response');

  const parsed = JSON.parse(match[0]) as Omit<ResumeResult, 'id'>[];
  return parsed.map((r, i) => ({ ...r, id: startIndex + i + 1 }));
}

export async function POST(request: NextRequest) {
  const {
    pages,
    jobDescription,
    rubric,
  }: { pages: string[]; jobDescription: string; rubric: RubricCriteria[] } =
    await request.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) =>
        controller.enqueue(encoder.encode(sse(event)));

      try {
        // ── Step 1: find resume boundaries ──────────────────────────────────
        send({
          type: 'status',
          phase: 'splitting',
          message: 'Identifying individual resumes in the PDF…',
        });

        const boundaries = await findResumeBoundaries(pages);

        if (boundaries.length === 0) {
          throw new Error(
            'Could not identify individual resumes. Make sure the PDF contains standard resume formatting.',
          );
        }

        // Build resume texts from page boundaries
        const resumeTexts: string[] = boundaries.map((startPage, i) => {
          const endPage = boundaries[i + 1] ?? pages.length;
          return pages.slice(startPage, endPage).join('\n\n');
        });

        const total = resumeTexts.length;

        send({
          type: 'status',
          phase: 'scoring',
          message: `Found ${total} resumes. Starting evaluation…`,
          processed: 0,
          total,
        });

        // ── Step 2: score in batches of 5 ──────────────────────────────────
        const allResults: ResumeResult[] = [];
        const BATCH = 5;

        for (let i = 0; i < resumeTexts.length; i += BATCH) {
          const batch = resumeTexts.slice(i, i + BATCH);
          const batchResults = await scoreBatch(batch, jobDescription, rubric, i);
          allResults.push(...batchResults);

          send({
            type: 'progress',
            phase: 'scoring',
            message: `Evaluated ${Math.min(i + BATCH, total)} of ${total} resumes…`,
            processed: Math.min(i + BATCH, total),
            total,
            batchResults,
          });
        }

        // Sort by overall score descending
        allResults.sort((a, b) => b.overallScore - a.overallScore);

        send({
          type: 'complete',
          message: `All ${total} resumes scored!`,
          results: allResults,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        send({ type: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

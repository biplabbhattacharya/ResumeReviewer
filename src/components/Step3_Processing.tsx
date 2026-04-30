'use client';

import { useEffect, useRef, useState } from 'react';
import { RubricCriteria, ResumeResult, SSEEvent } from '@/lib/types';

interface Props {
  pages: string[];
  jobDescription: string;
  rubric: RubricCriteria[];
  onComplete: (results: ResumeResult[]) => void;
  onError: (msg: string) => void;
}

export default function Step3_Processing({
  pages,
  jobDescription,
  rubric,
  onComplete,
  onError,
}: Props) {
  const [phase, setPhase] = useState<'splitting' | 'scoring'>('splitting');
  const [message, setMessage] = useState('Initializing…');
  const [processed, setProcessed] = useState(0);
  const [total, setTotal] = useState(0);
  const [liveResults, setLiveResults] = useState<ResumeResult[]>([]);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const res = await fetch('/api/process-resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages, jobDescription, rubric }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`API error: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6);
            if (!raw.trim()) continue;

            const event: SSEEvent = JSON.parse(raw);

            if (event.type === 'status') {
              setMessage(event.message);
              if (event.phase) setPhase(event.phase);
              if (event.total) setTotal(event.total);
            } else if (event.type === 'progress') {
              setMessage(event.message);
              if (event.phase) setPhase(event.phase);
              if (event.processed != null) setProcessed(event.processed);
              if (event.total) setTotal(event.total);
              if (event.batchResults) {
                setLiveResults((prev) => [...prev, ...event.batchResults!]);
              }
            } else if (event.type === 'complete') {
              onComplete(event.results ?? []);
            } else if (event.type === 'error') {
              onError(event.message);
            }
          }
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        onError(msg);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = total > 0 ? Math.round((processed / total) * 100) : phase === 'splitting' ? 10 : 0;

  return (
    <div className="space-y-6">
      <div className="card space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Processing Resumes</h2>
          <p className="text-sm text-slate-500">
            Claude is analyzing each resume. This may take a few minutes for large batches.
          </p>
        </div>

        {/* Phase stepper */}
        <div className="flex gap-6">
          {(['splitting', 'scoring'] as const).map((p) => (
            <div key={p} className="flex items-center gap-2">
              <div
                className={`h-3 w-3 rounded-full ${
                  phase === p
                    ? 'bg-blue-500 animate-pulse'
                    : p === 'splitting' && phase === 'scoring'
                      ? 'bg-emerald-500'
                      : 'bg-slate-300'
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  phase === p ? 'text-blue-600' : 'text-slate-500'
                }`}
              >
                {p === 'splitting' ? '1. Identify resumes' : '2. Score candidates'}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-700">{message}</span>
            {total > 0 && (
              <span className="font-mono text-slate-500">
                {processed}/{total}
              </span>
            )}
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Live results preview */}
        {liveResults.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
              Results so far ({liveResults.length})
            </p>
            <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 text-left text-slate-500">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Score</th>
                    <th className="px-3 py-2">Recommendation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {liveResults.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-slate-400">{r.id}</td>
                      <td className="px-3 py-2 font-medium">{r.name}</td>
                      <td className="px-3 py-2 text-slate-600">{r.currentTitle}</td>
                      <td className="px-3 py-2 font-bold text-blue-600">{r.overallScore}</td>
                      <td className="px-3 py-2">
                        <RecommendationBadge value={r.recommendation} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecommendationBadge({ value }: { value: string }) {
  const cls =
    value === 'Strong Yes'
      ? 'badge-strong-yes'
      : value === 'Yes'
        ? 'badge-yes'
        : value === 'Maybe'
          ? 'badge-maybe'
          : 'badge-no';
  return <span className={cls}>{value}</span>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { RubricCriteria, ResumeResult, SSEEvent } from '@/lib/types';
import { downloadExcel } from '@/lib/excel';

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
  const [interrupted, setInterrupted] = useState(false);
  const [interruptedMsg, setInterruptedMsg] = useState('');
  const [showSetup, setShowSetup] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const started = useRef(false);
  // Ref tracks accumulated results to avoid stale-closure reads after stream ends
  const accumulatedRef = useRef<ResumeResult[]>([]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      let receivedComplete = false;
      let handledError = false;

      try {
        const res = await fetch('/api/process-resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pages, jobDescription, rubric }),
        });

        if (!res.ok || !res.body) throw new Error(`API error: ${res.status}`);

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
                accumulatedRef.current = [...accumulatedRef.current, ...event.batchResults];
                setLiveResults([...accumulatedRef.current]);
              }
            } else if (event.type === 'complete') {
              receivedComplete = true;
              onComplete(event.results ?? []);
            } else if (event.type === 'error') {
              handledError = true;
              if (accumulatedRef.current.length > 0) {
                setInterrupted(true);
                setInterruptedMsg(event.message);
              } else {
                onError(event.message);
              }
            }
          }
        }

        // Stream closed without a complete event — likely a function timeout
        if (!receivedComplete && !handledError) {
          if (accumulatedRef.current.length > 0) {
            setInterrupted(true);
            setInterruptedMsg(
              'The connection closed before all resumes were scored — this usually means the serverless function timed out.',
            );
          } else {
            onError('Connection closed before any results were received. Try uploading a smaller batch.');
          }
        }
      } catch (err: unknown) {
        if (receivedComplete) return;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (accumulatedRef.current.length > 0) {
          setInterrupted(true);
          setInterruptedMsg(msg);
        } else {
          onError(msg);
        }
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pct = total > 0 ? Math.round((processed / total) * 100) : phase === 'splitting' ? 10 : 0;

  async function handlePartialDownload() {
    setDownloading(true);
    try {
      await downloadExcel(accumulatedRef.current, rubric, jobDescription);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Collapsible job setup */}
      <JobSetupPanel
        jobDescription={jobDescription}
        rubric={rubric}
        open={showSetup}
        onToggle={() => setShowSetup((v) => !v)}
      />

      {/* Main card */}
      <div className="card space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Processing Resumes</h2>
          <p className="text-sm text-slate-500">
            Claude is analyzing each resume. This may take a few minutes for large batches.
          </p>
        </div>

        {/* Timeout / partial-results banner */}
        {interrupted && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 mt-0.5">⚠</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">Processing interrupted</p>
                <p className="text-xs text-amber-700 mt-0.5">{interruptedMsg}</p>
              </div>
            </div>
            <p className="text-sm text-slate-700">
              <strong>{accumulatedRef.current.length}</strong> resume
              {accumulatedRef.current.length !== 1 ? 's were' : ' was'} scored before the
              interruption — you can download those results now.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-primary"
                onClick={handlePartialDownload}
                disabled={downloading}
              >
                {downloading
                  ? 'Generating…'
                  : `⬇ Download ${accumulatedRef.current.length} partial results`}
              </button>
              <button className="btn-secondary" onClick={() => onError('')}>
                Start over
              </button>
            </div>
          </div>
        )}

        {/* Phase stepper */}
        {!interrupted && (
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
        )}

        {/* Progress bar */}
        {!interrupted && (
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
        )}

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

function JobSetupPanel({
  jobDescription,
  rubric,
  open,
  onToggle,
}: {
  jobDescription: string;
  rubric: RubricCriteria[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="card p-4">
      <button
        className="flex w-full items-center justify-between text-sm font-medium text-slate-700"
        onClick={onToggle}
      >
        <span>Job setup</span>
        <span className="text-xs text-slate-400">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>
      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Job Description</p>
            <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed">
              {jobDescription}
            </pre>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Scoring Rubric</p>
            <div className="space-y-1.5">
              {rubric.map((c) => (
                <div key={c.id} className="flex items-start gap-2 text-xs">
                  <span className="w-8 shrink-0 text-right font-bold text-slate-400">
                    {c.weight}%
                  </span>
                  <span className="font-semibold text-slate-700">{c.name}</span>
                  <span className="text-slate-400">— {c.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

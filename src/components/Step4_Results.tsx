'use client';

import { useState } from 'react';
import { ResumeResult, RubricCriteria } from '@/lib/types';
import { downloadExcel } from '@/lib/excel';

interface Props {
  results: ResumeResult[];
  rubric: RubricCriteria[];
  fileName: string;
  onReset: () => void;
}

type SortKey = 'overallScore' | 'name' | 'yearsOfExperience' | 'recommendation';

const REC_ORDER: Record<string, number> = {
  'Strong Yes': 0,
  Yes: 1,
  Maybe: 2,
  No: 3,
};

export default function Step4_Results({ results, rubric, fileName, onReset }: Props) {
  const [search, setSearch] = useState('');
  const [filterRec, setFilterRec] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('overallScore');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const filtered = results
    .filter((r) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.currentTitle.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q);
      const matchesRec = filterRec === 'all' || r.recommendation === filterRec;
      return matchesSearch && matchesRec;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'overallScore') cmp = b.overallScore - a.overallScore;
      else if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortKey === 'recommendation')
        cmp = (REC_ORDER[a.recommendation] ?? 9) - (REC_ORDER[b.recommendation] ?? 9);
      else if (sortKey === 'yearsOfExperience')
        cmp = parseFloat(b.yearsOfExperience) - parseFloat(a.yearsOfExperience);
      return sortAsc ? -cmp : cmp;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadExcel(filtered, rubric);
    } finally {
      setDownloading(false);
    }
  }

  const counts = {
    'Strong Yes': results.filter((r) => r.recommendation === 'Strong Yes').length,
    Yes: results.filter((r) => r.recommendation === 'Yes').length,
    Maybe: results.filter((r) => r.recommendation === 'Maybe').length,
    No: results.filter((r) => r.recommendation === 'No').length,
  };

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.entries(counts) as [string, number][]).map(([rec, count]) => (
          <button
            key={rec}
            onClick={() => setFilterRec(filterRec === rec ? 'all' : rec)}
            className={`card flex flex-col items-center gap-1 py-4 transition-all hover:shadow-md ${
              filterRec === rec ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <span className="text-2xl font-bold text-slate-900">{count}</span>
            <RecommendationBadge value={rec} />
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="input flex-1 min-w-48"
          placeholder="Search by name, title, email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input w-40"
          value={filterRec}
          onChange={(e) => setFilterRec(e.target.value)}
        >
          <option value="all">All ({results.length})</option>
          <option value="Strong Yes">Strong Yes ({counts['Strong Yes']})</option>
          <option value="Yes">Yes ({counts.Yes})</option>
          <option value="Maybe">Maybe ({counts.Maybe})</option>
          <option value="No">No ({counts.No})</option>
        </select>
        <button className="btn-primary" onClick={handleDownload} disabled={downloading}>
          {downloading ? 'Generating…' : '⬇ Download Excel'}
        </button>
        <button className="btn-secondary" onClick={onReset}>
          Start over
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Showing {filtered.length} of {results.length} candidates from <strong>{fileName}</strong>
      </p>

      {/* Results table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left w-8">Rank</th>
                <SortHeader label="Name" sortKey="name" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <th className="px-4 py-3 text-left">Contact</th>
                <SortHeader label="Exp" sortKey="yearsOfExperience" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <th className="px-4 py-3 text-left">Education</th>
                <SortHeader label="Score" sortKey="overallScore" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <SortHeader label="Recommendation" sortKey="recommendation" current={sortKey} asc={sortAsc} onSort={toggleSort} />
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filtered.map((r, rank) => (
                <>
                  <tr
                    key={r.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <td className="px-4 py-3 text-slate-400 text-center">{rank + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{r.name}</div>
                      <div className="text-xs text-slate-500">{r.currentTitle}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-slate-600">{r.email}</div>
                      <div className="text-xs text-slate-500">{r.phone}</div>
                      <div className="text-xs text-slate-400">{r.location}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium">{r.yearsOfExperience}y</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-32 truncate">
                      {r.education}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ScorePill score={r.overallScore} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <RecommendationBadge value={r.recommendation} />
                    </td>
                    <td className="px-4 py-3 text-center text-slate-400 text-lg">
                      {expandedId === r.id ? '▲' : '▼'}
                    </td>
                  </tr>

                  {expandedId === r.id && (
                    <tr key={`${r.id}-detail`} className="bg-blue-50/40">
                      <td colSpan={8} className="px-6 py-5">
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                          {/* Summary */}
                          <div className="sm:col-span-2 lg:col-span-3">
                            <p className="text-xs font-semibold uppercase text-slate-500 mb-1">Summary</p>
                            <p className="text-sm text-slate-700">{r.summary}</p>
                          </div>

                          {/* Strengths */}
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Key Strengths</p>
                            <ul className="space-y-1">
                              {r.keyStrengths?.map((s, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-700">
                                  <span className="text-emerald-500 mt-0.5">✓</span> {s}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Weaknesses */}
                          <div>
                            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Key Weaknesses</p>
                            <ul className="space-y-1">
                              {r.keyWeaknesses?.map((s, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-700">
                                  <span className="text-amber-500 mt-0.5">△</span> {s}
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Rubric scores */}
                          <div className="sm:col-span-2 lg:col-span-3">
                            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                              Rubric Scores
                            </p>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                              {rubric.map((c) => {
                                const score = r.rubricScores?.[c.name] ?? 0;
                                return (
                                  <div key={c.id} className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                      <span className="font-medium text-slate-700">{c.name}</span>
                                      <span className="font-bold text-slate-900">{score}/10</span>
                                    </div>
                                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                                      <div
                                        className={`h-full rounded-full ${
                                          score >= 8
                                            ? 'bg-emerald-500'
                                            : score >= 6
                                              ? 'bg-blue-500'
                                              : score >= 4
                                                ? 'bg-amber-500'
                                                : 'bg-red-400'
                                        }`}
                                        style={{ width: `${score * 10}%` }}
                                      />
                                    </div>
                                    {r.rubricComments?.[c.name] && (
                                      <p className="text-xs text-slate-500 italic">
                                        {r.rubricComments[c.name]}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  current,
  asc,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  asc: boolean;
  onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className="cursor-pointer select-none px-4 py-3 text-left hover:text-blue-600"
      onClick={() => onSort(sortKey)}
    >
      {label}
      <span className="ml-1 text-slate-400">{active ? (asc ? '↑' : '↓') : '↕'}</span>
    </th>
  );
}

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-emerald-100 text-emerald-800'
      : score >= 60
        ? 'bg-blue-100 text-blue-800'
        : score >= 40
          ? 'bg-amber-100 text-amber-800'
          : 'bg-red-100 text-red-800';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-bold ${color}`}>
      {score}
    </span>
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

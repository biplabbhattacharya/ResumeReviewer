'use client';

import { useState } from 'react';
import { RubricCriteria, DEFAULT_RUBRIC } from '@/lib/types';

interface Props {
  jobDescription: string;
  rubric: RubricCriteria[];
  onJobDescriptionChange: (v: string) => void;
  onRubricChange: (r: RubricCriteria[]) => void;
  onNext: () => void;
}

export default function Step1_JobSetup({
  jobDescription,
  rubric,
  onJobDescriptionChange,
  onRubricChange,
  onNext,
}: Props) {
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newWeight, setNewWeight] = useState(10);

  const totalWeight = rubric.reduce((s, c) => s + c.weight, 0);
  const canProceed = jobDescription.trim().length > 50 && rubric.length > 0 && totalWeight === 100;

  function updateCriteria(id: string, field: keyof RubricCriteria, value: string | number) {
    onRubricChange(rubric.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  function addCriteria() {
    if (!newName.trim()) return;
    onRubricChange([
      ...rubric,
      {
        id: Date.now().toString(),
        name: newName.trim(),
        description: newDesc.trim(),
        weight: newWeight,
      },
    ]);
    setNewName('');
    setNewDesc('');
    setNewWeight(10);
  }

  function removeCriteria(id: string) {
    onRubricChange(rubric.filter((c) => c.id !== id));
  }

  function resetRubric() {
    onRubricChange(DEFAULT_RUBRIC);
  }

  return (
    <div className="space-y-8">
      {/* Job Description */}
      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Job Description</h2>
          <p className="text-sm text-slate-500">
            Paste the full job description. The AI uses this to score relevance.
          </p>
        </div>
        <div>
          <label className="label">Job Description *</label>
          <textarea
            className="input min-h-[200px] resize-y font-mono text-xs"
            placeholder="Paste the full job description here…"
            value={jobDescription}
            onChange={(e) => onJobDescriptionChange(e.target.value)}
          />
          {jobDescription.trim().length > 0 && jobDescription.trim().length < 50 && (
            <p className="mt-1 text-xs text-red-500">Please provide a more complete job description (at least 50 characters).</p>
          )}
        </div>
      </div>

      {/* Rubric */}
      <div className="card space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Scoring Rubric</h2>
            <p className="text-sm text-slate-500">
              Define criteria and weights. <strong>Weights must sum to 100%.</strong>
            </p>
          </div>
          <button className="btn-secondary text-xs" onClick={resetRubric}>
            Reset to defaults
          </button>
        </div>

        {/* Criteria list */}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Criterion</th>
                <th className="px-4 py-2 text-left">Description</th>
                <th className="px-4 py-2 text-right w-24">Weight %</th>
                <th className="px-4 py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rubric.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2">
                    <input
                      className="input py-1 font-medium"
                      value={c.name}
                      onChange={(e) => updateCriteria(c.id, 'name', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="input py-1 text-slate-600"
                      value={c.description}
                      onChange={(e) => updateCriteria(c.id, 'description', e.target.value)}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      className="input py-1 text-right"
                      value={c.weight}
                      onChange={(e) =>
                        updateCriteria(c.id, 'weight', parseInt(e.target.value) || 0)
                      }
                    />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button className="btn-danger" onClick={() => removeCriteria(c.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td className="px-4 py-2 font-semibold text-slate-700" colSpan={2}>
                  Total Weight
                </td>
                <td
                  className={`px-4 py-2 text-right font-bold ${
                    totalWeight === 100 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                  colSpan={2}
                >
                  {totalWeight}%{totalWeight !== 100 && ' (must be 100%)'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Add criterion row */}
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500">Add criterion</p>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="Criterion name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <input
              className="input flex-1"
              placeholder="What to evaluate"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
            <input
              type="number"
              min={1}
              max={100}
              className="input w-20"
              placeholder="%"
              value={newWeight}
              onChange={(e) => setNewWeight(parseInt(e.target.value) || 0)}
            />
            <button className="btn-primary" onClick={addCriteria} disabled={!newName.trim()}>
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="btn-primary" onClick={onNext} disabled={!canProceed}>
          Next: Upload PDF →
        </button>
      </div>

      {!canProceed && (
        <p className="text-center text-xs text-slate-400">
          {totalWeight !== 100
            ? `Adjust weights to equal 100% (currently ${totalWeight}%)`
            : 'Add a job description to continue'}
        </p>
      )}
    </div>
  );
}

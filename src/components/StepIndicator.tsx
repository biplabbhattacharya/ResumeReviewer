'use client';

const STEPS = [
  { label: 'Job & Rubric' },
  { label: 'Upload PDF' },
  { label: 'Processing' },
  { label: 'Results' },
];

export default function StepIndicator({ current }: { current: number }) {
  return (
    <nav className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ring-2 transition-all ${
                  done
                    ? 'bg-blue-600 text-white ring-blue-600'
                    : active
                      ? 'bg-white text-blue-600 ring-blue-600'
                      : 'bg-white text-slate-400 ring-slate-300'
                }`}
              >
                {done ? '✓' : i + 1}
              </div>
              <span
                className={`mt-1 hidden text-xs font-medium sm:block ${
                  active ? 'text-blue-600' : done ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-2 mb-4 h-0.5 w-12 sm:w-20 transition-colors ${
                  done ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

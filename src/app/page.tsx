'use client';

import { useState } from 'react';
import { RubricCriteria, ResumeResult, DEFAULT_RUBRIC } from '@/lib/types';
import StepIndicator from '@/components/StepIndicator';
import Step1_JobSetup from '@/components/Step1_JobSetup';
import Step2_Upload from '@/components/Step2_Upload';
import Step3_Processing from '@/components/Step3_Processing';
import Step4_Results from '@/components/Step4_Results';

export default function Home() {
  const [step, setStep] = useState(0);
  const [jobDescription, setJobDescription] = useState('');
  const [rubric, setRubric] = useState<RubricCriteria[]>(DEFAULT_RUBRIC);
  const [pages, setPages] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');
  const [results, setResults] = useState<ResumeResult[]>([]);
  const [error, setError] = useState('');

  function reset() {
    setStep(0);
    setPages([]);
    setFileName('');
    setResults([]);
    setError('');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Resume Reviewer</h1>
            <p className="text-xs text-slate-500">AI-powered candidate scoring · No data stored</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
            Powered by Claude
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Step indicator */}
        <div className="mb-10 flex justify-center">
          <StepIndicator current={step} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
            <span className="text-lg">⚠</span>
            <div>
              <p className="font-semibold">Something went wrong</p>
              <p>{error}</p>
              <button className="mt-2 underline text-red-600 text-xs" onClick={reset}>
                Start over
              </button>
            </div>
          </div>
        )}

        {/* Steps */}
        {step === 0 && (
          <Step1_JobSetup
            jobDescription={jobDescription}
            rubric={rubric}
            onJobDescriptionChange={setJobDescription}
            onRubricChange={setRubric}
            onNext={() => setStep(1)}
          />
        )}

        {step === 1 && (
          <Step2_Upload
            onBack={() => setStep(0)}
            onPagesReady={(p, name) => {
              setPages(p);
              setFileName(name);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <Step3_Processing
            pages={pages}
            jobDescription={jobDescription}
            rubric={rubric}
            onComplete={(r) => {
              setResults(r);
              setStep(3);
            }}
            onError={(msg) => {
              setError(msg);
              setStep(1);
            }}
          />
        )}

        {step === 3 && (
          <Step4_Results
            results={results}
            rubric={rubric}
            jobDescription={jobDescription}
            fileName={fileName}
            onReset={reset}
          />
        )}
      </main>

      <footer className="mt-20 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        Resume Reviewer · Built with Next.js + Anthropic Claude + Biplab Bhattacharya· No resume data is stored or
        transmitted beyond processing
      </footer>
    </div>
  );
}

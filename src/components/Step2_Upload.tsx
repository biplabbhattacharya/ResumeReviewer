'use client';

import { useCallback, useState } from 'react';

interface Props {
  onPagesReady: (pages: string[], fileName: string) => void;
  onBack: () => void;
}

export default function Step2_Upload({ onPagesReady, onBack }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState(0);

  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setError('Please upload a PDF file.');
        return;
      }

      setError('');
      setStatus('Loading PDF library…');
      setProgress(5);

      try {
        // Dynamic import to avoid SSR issues
        const pdfjs = await import('pdfjs-dist');
        // Use the bundled legacy worker via CDN so we don't need extra config
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        setStatus('Reading PDF…');
        setProgress(10);

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;

        setStatus(`Extracting text from ${numPages} pages…`);

        const pages: string[] = [];
        for (let p = 1; p <= numPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          const text = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
          pages.push(text);
          setProgress(10 + Math.round((p / numPages) * 85));
        }

        setProgress(100);
        setStatus(`Done — extracted ${numPages} pages.`);
        onPagesReady(pages, file.name);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to read PDF';
        setError(msg);
        setStatus('');
        setProgress(0);
      }
    },
    [onPagesReady],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Upload Resume PDF</h2>
          <p className="text-sm text-slate-500">
            Upload a single PDF containing all candidate resumes. The file is processed entirely in
            your browser — nothing is stored.
          </p>
        </div>

        {/* Drop zone */}
        <label
          className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/50'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) processFile(file);
            }}
          />
          <div className="text-4xl">📄</div>
          <div className="text-center">
            <p className="font-semibold text-slate-700">Drop your PDF here or click to browse</p>
            <p className="mt-1 text-sm text-slate-500">
              Supports multi-resume batch PDFs up to ~100 candidates
            </p>
          </div>
        </label>

        {/* Progress */}
        {status && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-600">
              <span>{status}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
      </div>
    </div>
  );
}

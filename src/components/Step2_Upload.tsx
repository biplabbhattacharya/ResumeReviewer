'use client';

import { useCallback, useState } from 'react';

interface FileStatus {
  name: string;
  pages: number;
  state: 'pending' | 'processing' | 'done';
}

interface Props {
  onPagesReady: (pages: string[], fileName: string) => void;
  onBack: () => void;
}

export default function Step2_Upload({ onPagesReady, onBack }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const processFiles = useCallback(
    async (files: File[]) => {
      const pdfs = files.filter((f) => f.name.toLowerCase().endsWith('.pdf'));
      if (pdfs.length === 0) {
        setError('Please upload at least one PDF file.');
        return;
      }

      const skipped = files.length - pdfs.length;
      setError(skipped > 0 ? `${skipped} non-PDF file(s) ignored.` : '');
      setProcessing(true);
      setFileStatuses(pdfs.map((f) => ({ name: f.name, pages: 0, state: 'pending' })));

      const allPages: string[] = [];

      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

        for (let i = 0; i < pdfs.length; i++) {
          setFileStatuses((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, state: 'processing' } : f)),
          );
          setCurrentProgress(0);

          const arrayBuffer = await pdfs[i].arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;

          for (let p = 1; p <= numPages; p++) {
            const page = await pdf.getPage(p);
            const content = await page.getTextContent();
            const text = content.items
              .map((item) => ('str' in item ? item.str : ''))
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            allPages.push(text);
            setCurrentProgress(Math.round((p / numPages) * 100));
          }

          setFileStatuses((prev) =>
            prev.map((f, idx) => (idx === i ? { ...f, pages: numPages, state: 'done' } : f)),
          );
        }

        const label =
          pdfs.length === 1
            ? pdfs[0].name
            : `${pdfs.length} files (${allPages.length} pages total)`;

        onPagesReady(allPages, label);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to read PDF');
        setProcessing(false);
      }
    },
    [onPagesReady],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) processFiles(files);
    },
    [processFiles],
  );

  const totalPages = fileStatuses.reduce((sum, f) => sum + f.pages, 0);
  const doneCount = fileStatuses.filter((f) => f.state === 'done').length;
  const isExtracting = fileStatuses.some((f) => f.state === 'processing');

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Upload Resume PDFs</h2>
          <p className="text-sm text-slate-500">
            Upload one or more PDFs — each can contain a single resume or a whole batch. Everything
            is processed in your browser; nothing is stored.
          </p>
        </div>

        {/* Drop zone — hidden once processing starts */}
        {!processing && (
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
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length > 0) processFiles(files);
              }}
            />
            <div className="text-4xl">📄</div>
            <div className="text-center">
              <p className="font-semibold text-slate-700">Drop PDFs here or click to browse</p>
              <p className="mt-1 text-sm text-slate-500">
                Select one or more files · each can be a single resume or a batch PDF
              </p>
            </div>
          </label>
        )}

        {/* Per-file progress list */}
        {fileStatuses.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              {doneCount === fileStatuses.length
                ? `Done — ${totalPages} pages extracted from ${fileStatuses.length} file${fileStatuses.length > 1 ? 's' : ''}`
                : `Processing ${doneCount + 1} of ${fileStatuses.length}…`}
            </p>

            <div className="overflow-hidden rounded-lg border border-slate-200 divide-y divide-slate-100">
              {fileStatuses.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="shrink-0 text-base">
                    {f.state === 'done' ? '✅' : f.state === 'processing' ? '⏳' : '○'}
                  </span>
                  <span className="flex-1 truncate font-medium text-slate-700">{f.name}</span>
                  {f.state === 'done' && (
                    <span className="text-xs text-slate-400">{f.pages}p</span>
                  )}
                  {f.state === 'processing' && (
                    <span className="text-xs font-mono text-blue-500">{currentProgress}%</span>
                  )}
                </div>
              ))}
            </div>

            {isExtracting && (
              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button className="btn-secondary" onClick={onBack} disabled={processing}>
          ← Back
        </button>
      </div>
    </div>
  );
}

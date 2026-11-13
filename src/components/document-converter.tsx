'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { formatBytes, outputFilename } from '@/lib/pdf';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

function createOfficePdfWorker() {
  return new Worker(new URL('../lib/office-to-pdf.worker.ts', import.meta.url), { type: 'module' });
}

const modes = {
  'word-to-pdf': {
    workspace: 'Word to PDF workspace', heading: 'Your document', prompt: 'Choose a Word document',
    inputLabel: 'Choose Word document', select: 'Select Word document', replace: 'Choose another document',
    hint: 'One .docx or .doc file up to 20 MB', accept: '.doc,.docx', extension: /\.docx?$/i,
    invalid: 'Choose a .docx or .doc file.', singular: 'Word document', action: 'Convert to PDF', ready: 'Your PDF is ready',
    output: 'PDF', mimeType: 'application/pdf',
    details: 'Conversion runs in your browser. Substitute fonts and complex layouts can change how pages look.',
    createWorker: createOfficePdfWorker,
  },
  'excel-to-pdf': {
    workspace: 'Excel to PDF workspace', heading: 'Your workbook', prompt: 'Choose an Excel workbook',
    inputLabel: 'Choose Excel workbook', select: 'Select Excel workbook', replace: 'Choose another workbook',
    hint: 'One .xlsx or .xls file up to 20 MB', accept: '.xlsx,.xls', extension: /\.xlsx?$/i,
    invalid: 'Choose an .xlsx or .xls file.', singular: 'Excel workbook', action: 'Convert to PDF', ready: 'Your PDF is ready',
    output: 'PDF', mimeType: 'application/pdf',
    details: 'Conversion runs in your browser. Review page breaks and wide tables in the finished PDF.',
    createWorker: createOfficePdfWorker,
  },
  'pdf-to-word': {
    workspace: 'PDF to Word workspace', heading: 'Your PDF', prompt: 'Choose a PDF with selectable text',
    inputLabel: 'Choose PDF', select: 'Select PDF', replace: 'Choose another PDF',
    hint: 'One PDF up to 20 MB', accept: '.pdf,application/pdf', extension: /\.pdf$/i,
    invalid: 'Choose a .pdf file.', singular: 'PDF', action: 'Convert to Word', ready: 'Your Word document is ready',
    output: 'DOCX', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    details: 'Conversion runs in your browser. Scans require OCR, and complex layouts may change in Word.',
    createWorker: () => new Worker(new URL('../lib/pdf-to-word.worker.ts', import.meta.url), { type: 'module' }),
  },
  'pdf-to-excel': {
    workspace: 'PDF to Excel workspace', heading: 'Your PDF', prompt: 'Choose a PDF with selectable text',
    inputLabel: 'Choose PDF', select: 'Select PDF', replace: 'Choose another PDF',
    hint: 'One PDF up to 20 MB', accept: '.pdf,application/pdf', extension: /\.pdf$/i,
    invalid: 'Choose a .pdf file.', singular: 'PDF', action: 'Convert to Excel', ready: 'Your workbook is ready',
    output: 'XLSX', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    details: 'Rows from all pages with selectable text appear in PDF order. Image-only scans need OCR first.',
    createWorker: () => new Worker(new URL('../lib/pdf-to-excel.worker.ts', import.meta.url), { type: 'module' }),
  },
} as const;

type ConversionMessage = { bytes: ArrayBuffer; hasChanges?: boolean; notice?: string } | { error: string };

export function DocumentConverter({ mode }: { mode: keyof typeof modes }) {
  const config = modes[mode];
  const picker = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [file, setFile] = useState<File>();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ blob: Blob; notice?: string }>();
  const url = useBlobUrl(result?.blob);
  const pdfName = file ? outputFilename(file.name.replace(config.extension, '')) : 'converted.pdf';
  const filename = pdfName.replace(/\.pdf$/i, `.${config.output.toLowerCase()}`);

  useEffect(() => {
    setReady(true);
    return () => {
      clearTimeout(timeout.current);
      worker.current?.terminate();
      worker.current = null;
    };
  }, []);

  function choose(files: FileList | null) {
    if (!ready || worker.current || !files?.length) return;
    setResult(undefined);
    setFile(undefined);
    setError('');
    if (files.length !== 1) {
      setError(`Choose one ${config.singular} at a time.`);
      return;
    }
    const selected = files[0];
    if (!config.extension.test(selected.name)) { setError(config.invalid); return; }
    if (!selected.size || selected.size > 20 * 1024 * 1024) { setError('Choose a non-empty document up to 20 MB.'); return; }
    setFile(selected);
  }

  function stop() {
    clearTimeout(timeout.current);
    worker.current?.terminate();
    worker.current = null;
    setBusy(false);
  }

  function convert() {
    if (!file || worker.current) return;
    setBusy(true);
    setError('');
    const engineError = { error: 'The converter could not start. Reload and try again.' };
    let job: Worker;
    try {
      job = config.createWorker();
    } catch {
      setError(engineError.error);
      setBusy(false);
      return;
    }
    worker.current = job;
    function finish(message: ConversionMessage) {
      if (worker.current !== job) return;
      stop();
      if ('error' in message) setError(message.error);
      else setResult({
        blob: new Blob([message.bytes], { type: config.mimeType }),
        notice: message.notice ?? (message.hasChanges ? 'Some formatting may have changed. Review the result before sharing it.' : undefined),
      });
    }
    job.onmessage = ({ data }) => finish(data);
    job.onmessageerror = () => finish(engineError);
    job.onerror = event => { event.preventDefault(); finish(engineError); };
    timeout.current = setTimeout(() => finish({ error: 'Conversion took too long. Try a smaller document.' }), 60_000);
    job.postMessage(file);
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label={config.workspace} aria-busy={busy}>
      <div className="panel-heading"><h2>{config.heading}</h2>{file && <span>{formatBytes(file.size)}</span>}</div>
      <div className={`drop-zone ${file ? 'is-compact' : ''} ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}>
        <input ref={picker} type="file" accept={config.accept} aria-label={config.inputLabel} className="sr-only" tabIndex={-1}
          disabled={!ready || busy} onChange={event => { choose(event.target.files); event.target.value = ''; }} />
        <h3 className="break-all">{file?.name ?? config.prompt}</h3>
        {!file && <p>{config.hint}</p>}
        <button type="button" className="upload-button" disabled={!ready || busy} onClick={() => picker.current?.click()}>
          <Upload aria-hidden="true" />{file ? config.replace : config.select}
        </button>
      </div>
      {file && !result && <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" className="primary" disabled={busy} onClick={convert}>
          <FileText size={18} aria-hidden="true" />{busy ? 'Converting…' : config.action}
        </button>
        {busy && <button type="button" className="secondary-action" onClick={stop}>Cancel</button>}
      </div>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {url && <><div className="result max-sm:flex-col! max-sm:items-start!" aria-live="polite">
        <div>
          <h3>{config.ready}</h3>
          <p className="break-all">{filename}</p>
          {result?.notice && <p>{result.notice}</p>}
        </div>
        <DownloadButton href={url} download={filename} label={`Download ${config.output}`} />
      </div><AdSlot position="download" /></>}
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>{config.output} output</h2><FileText size={18} aria-hidden="true" /></div>
        <p>{config.details}</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

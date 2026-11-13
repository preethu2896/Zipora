'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, RotateCcw, RotateCw, Upload } from 'lucide-react';
import { MAX_TOTAL_BYTES, formatBytes, inspectPdf, loadPdf, outputFilename } from '@/lib/pdf';
import { normalizeRotation, saveRotatedPdf } from '@/lib/rotate-pdf';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';

type PreviewDocument = Awaited<ReturnType<typeof import('@/lib/conversions').openRenderedPdf>>;

function PagePreview({ pdf, page, angle }: { pdf: PreviewDocument; page: number; angle: number }) {
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    void import('@/lib/conversions')
      .then(module => active ? module.renderRotationPreview(pdf, page, angle) : undefined)
      .then(preview => {
        if (!active || !preview) return;
        objectUrl = URL.createObjectURL(preview.blob);
        setUrl(objectUrl);
      })
      .catch(() => { if (active) setFailed(true); });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [pdf, page, angle]);

  return <div className="grid h-[280px] place-items-center rounded-lg bg-neutral-100 p-4 sm:h-[340px]">
    {url ? <img className="max-h-[248px] max-w-full bg-white object-contain shadow-sm sm:max-h-[308px]" src={url} alt={`Preview of page ${page}`} />
      : <p role="status">{failed ? 'Preview unavailable. You can still rotate this page.' : 'Preparing preview…'}</p>}
  </div>;
}

export function RotatePdfTool() {
  const input = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const [ready, setReady] = useState(false);
  const [file, setFile] = useState<File>();
  const [rotations, setRotations] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [allPages, setAllPages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<PreviewDocument>();
  const [previewError, setPreviewError] = useState(false);
  const [result, setResult] = useState<Blob>();
  const [downloadUrl, setDownloadUrl] = useState('');
  const changed = rotations.filter(Boolean).length;
  const name = file ? outputFilename(file.name.replace(/\.pdf$/i, '') + '-rotated') : 'rotated.pdf';

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (!file) return;
    let active = true;
    let document: PreviewDocument | undefined;
    void import('@/lib/conversions').then(module => active ? module.openRenderedPdf(file) : undefined)
      .then(opened => {
        if (!active) { void opened?.destroy().catch(() => {}); return; }
        document = opened;
        setPreview(opened);
      })
      .catch(() => { if (active) setPreviewError(true); });
    return () => {
      active = false;
      void document?.destroy().catch(() => {});
    };
  }, [file]);

  useEffect(() => {
    if (!result) return;
    const url = URL.createObjectURL(result);
    setDownloadUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [result]);

  async function choose(files: FileList | null) {
    if (!ready || locked.current || !files?.length) return;
    if (files.length !== 1) { setError('Choose one PDF at a time.'); return; }
    const next = files[0];
    if (next.size > MAX_TOTAL_BYTES) { setError('Choose a PDF up to 200 MB.'); return; }
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const count = await inspectPdf(next);
      setFile(next);
      setPreview(undefined);
      setPreviewError(false);
      setIndex(0);
      setAllPages(false);
      setRotations(Array<number>(count).fill(0));
      setResult(undefined);
      setDownloadUrl('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open the PDF.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  function updateRotations(next: number[]) {
    setRotations(next);
    setResult(undefined);
    setDownloadUrl('');
    setError('');
  }

  function rotate(delta: number) {
    updateRotations(rotations.map((angle, page) => allPages || page === index ? normalizeRotation(angle + delta) : angle));
  }

  async function save() {
    if (!file || !changed || locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const bytes = await saveRotatedPdf(await loadPdf(file), rotations);
      setResult(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
    } catch {
      setError('Could not save this PDF. Try a smaller or undamaged copy.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="Rotate PDF workspace" aria-busy={busy}>
      <div className="panel-heading"><h2>Your PDF</h2>{file && <span>{formatBytes(file.size)}</span>}</div>
      <div className={`drop-zone ${file ? 'is-compact' : ''} ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files); }}>
        <input ref={input} type="file" accept=".pdf,application/pdf" aria-label="Choose PDF" className="sr-only"
          tabIndex={-1} disabled={!ready || busy} onChange={event => { void choose(event.target.files); event.target.value = ''; }} />
        <h3 className="break-all">{file?.name ?? 'Choose a PDF to rotate'}</h3>
        {!file && <p>One unlocked PDF up to 200 MB</p>}
        <button type="button" className="upload-button" disabled={!ready || busy} onClick={() => input.current?.click()}>
          <Upload aria-hidden="true" />{file ? 'Choose another PDF' : 'Select PDF'}
        </button>
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
      {file && <div className="mt-4 grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button type="button" className="secondary-action min-h-11 min-w-11 justify-center !p-2" aria-label="Previous page" disabled={busy || index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft aria-hidden="true" /></button>
          <p aria-live="polite" className="tabular-nums">Page {index + 1} of {rotations.length} · {rotations[index]}° added</p>
          <button type="button" className="secondary-action min-h-11 min-w-11 justify-center !p-2" aria-label="Next page" disabled={busy || index + 1 === rotations.length} onClick={() => setIndex(index + 1)}><ChevronRight aria-hidden="true" /></button>
        </div>
        {preview ? <PagePreview key={`${index}:${rotations[index]}`} pdf={preview} page={index + 1} angle={rotations[index]} />
          : <div className="grid h-[280px] place-items-center rounded-lg bg-neutral-100 p-4 sm:h-[340px]" role="status">{previewError ? 'Preview unavailable. You can still rotate the PDF.' : 'Opening preview…'}</div>}
        <fieldset disabled={busy} className="grid gap-3">
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={allPages} onChange={event => setAllPages(event.target.checked)} /> Rotate all pages</label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="secondary-action min-h-11" onClick={() => rotate(-90)}><RotateCcw size={18} aria-hidden="true" /> Rotate left</button>
            <button type="button" className="secondary-action min-h-11" onClick={() => rotate(90)}><RotateCw size={18} aria-hidden="true" /> Rotate right</button>
            <button type="button" className="secondary-action min-h-11" disabled={!changed} onClick={() => updateRotations(rotations.map(() => 0))}>Reset rotations</button>
          </div>
        </fieldset>
        <button type="button" className="primary" disabled={!changed || busy} onClick={() => void save()}>{busy ? 'Working…' : 'Save rotated PDF'}</button>
        {downloadUrl && <div className="result">
          <div><h3>Your rotated PDF is ready</h3><p>{name}</p></div>
          <DownloadButton href={downloadUrl} download={name} label="Download PDF" />
        </div>}
        {downloadUrl && <AdSlot position="download" />}
      </div>}
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Output</h2><FileText size={18} aria-hidden="true" /></div>
        <dl className="document-stats">
          <div><dt>Format</dt><dd>PDF</dd></div>
          <div><dt>Pages to rotate</dt><dd>{file ? changed : '—'}</dd></div>
        </dl>
        <p>Your PDF stays on this device.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

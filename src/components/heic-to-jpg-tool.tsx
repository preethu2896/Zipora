'use client';

import { checkArchiveLimits, safeDownloadName } from '@/lib/archive-safety';
import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { convertHeic, hasHeicHeader, maxHeicBatchBytes, maxHeicFileBytes, maxHeicFiles } from '@/lib/heic-conversion';
import { formatBytes } from '@/lib/pdf';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

type Result = { blob: Blob; name: string; preview: Blob; count: number; width: number; height: number };

function jpgName(file: File) {
  const stem = file.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 110);
  return (stem || 'photo') + '.jpg';
}

export function HeicToJpgTool() {
  const picker = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const locked = useRef(false);
  const [ready, setReady] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState('');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result>();
  const previewUrl = useBlobUrl(result?.preview);
  const resultUrl = useBlobUrl(result?.blob);
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  useEffect(() => {
    mounted.current = true;
    setReady(true);
    return () => { mounted.current = false; };
  }, []);

  function clearOutput() {
    setError('');
    setResult(undefined);
  }

  async function add(selected: File[]) {
    if (!ready || locked.current || !selected.length) return;
    clearOutput();
    if (files.length + selected.length > maxHeicFiles) { setError('Choose up to 12 photos per batch.'); return; }
    if (selected.some(file => file.size > maxHeicFileBytes) || totalBytes + selected.reduce((sum, file) => sum + file.size, 0) > maxHeicBatchBytes) {
      setError('Choose photos up to 20 MB each and 60 MB combined.');
      return;
    }
    locked.current = true;
    setBusy('Checking files…');
    try {
      for (const file of selected) {
        if (!await hasHeicHeader(file)) throw new Error(`“${file.name}” is not a supported HEIC or HEIF photo.`);
      }
      if (mounted.current) setFiles(previous => [...previous, ...selected]);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not read the selected photos.');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy('');
    }
  }

  async function convert() {
    if (!files.length || locked.current) return;
    locked.current = true;
    clearOutput();
    try {
      const outputs: { blob: Blob; name: string; width: number; height: number }[] = [];
      let bytes = 0;
      for (const [index, file] of files.entries()) {
        if (!mounted.current) return;
        setBusy(`Converting photo ${index + 1} of ${files.length}…`);
        const image = await convertHeic(file, quality / 100);
        bytes += image.blob.size;
        if (bytes > 120 * 1024 * 1024) throw new Error('The converted photos exceed 120 MB. Use a smaller batch or lower quality.');
        const name = files.length === 1 ? jpgName(file) : `${String(index + 1).padStart(2, '0')}-${jpgName(file)}`;
        outputs.push({ ...image, name });
      }
      const first = outputs[0];
      let blob = first.blob;
      if (outputs.length > 1) {
        const { default: JSZip } = await import('jszip');
        checkArchiveLimits(outputs.length, outputs.reduce((total, output) => total + output.blob.size, 0));
        const zip = new JSZip();
        for (const output of outputs) zip.file(safeDownloadName(output.name), await output.blob.arrayBuffer());
        blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
      }
      if (mounted.current) setResult({ blob, name: outputs.length === 1 ? first.name : 'zipora-jpgs.zip', preview: first.blob, count: outputs.length, width: first.width, height: first.height });
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not convert the selected photos.');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy('');
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="HEIC to JPG workspace" aria-busy={Boolean(busy)}>
      <div className="panel-heading"><h2>Your photos</h2>{files.length > 0 && <span>{formatBytes(totalBytes)}</span>}</div>
      <div className={`drop-zone ${files.length ? 'is-compact' : ''} ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void add(Array.from(event.dataTransfer.files)); }}>
        <input ref={picker} type="file" accept=".heic,.heif,image/heic,image/heif" multiple aria-label="Choose HEIC photos" className="sr-only" tabIndex={-1}
          disabled={!ready || Boolean(busy)} onChange={event => { void add(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        <h3>{files.length ? 'Add more HEIC photos' : 'Choose HEIC or HEIF photos'}</h3>
        <p>Up to 12 photos · 20 MB each · 60 MB total</p>
        <button type="button" className="upload-button" disabled={!ready || Boolean(busy)} onClick={() => picker.current?.click()}>
          <Upload aria-hidden="true" />{files.length ? 'Add photos' : 'Select photos'}
        </button>
      </div>
      {files.length > 0 && <div className="mt-5 grid min-w-0 gap-4">
        <ul aria-label="Selected photos">
          {files.map((file, index) => <li className="flex min-w-0 items-center gap-3 border-b border-neutral-200 py-2" key={`${index}-${file.name}`}>
            <ImageIcon size={18} className="shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1"><p className="break-all text-sm">{file.name}</p><span className="text-xs">{formatBytes(file.size)}</span></div>
            <button type="button" className="secondary-action min-h-11 min-w-11 justify-center !p-2" disabled={Boolean(busy)}
              aria-label={`Remove ${file.name}`} onClick={() => { clearOutput(); setFiles(files.filter((_, position) => position !== index)); }}>
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </li>)}
        </ul>
        <label className="grid gap-2 text-sm"><span>JPG quality <strong>{quality}%</strong></span>
          <input type="range" min={50} max={100} value={quality} disabled={Boolean(busy)} aria-label="JPG quality"
            onChange={event => { clearOutput(); setQuality(Number(event.target.value)); }} />
        </label>
        <button type="button" className="primary" disabled={Boolean(busy)} onClick={() => void convert()}>Convert to JPG</button>
      </div>}
      {busy && <p className="mt-4 text-sm" role="status">{busy}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {result && previewUrl && resultUrl && <>
        <figure className="mt-4 grid justify-items-center gap-2 rounded-lg bg-neutral-100 p-4">
          <img className="max-h-[320px] max-w-full object-contain" src={previewUrl} alt="Converted JPG preview" />
          <figcaption className="text-sm">{result.count > 1 ? 'First photo · ' : ''}{result.width} × {result.height} px</figcaption>
        </figure>
        <div className="result flex-col sm:flex-row">
          <div><h3>{result.count === 1 ? 'Your JPG is ready' : 'Your JPGs are ready'}</h3><p>{formatBytes(result.blob.size)}</p></div>
          <DownloadButton className="shrink-0 whitespace-nowrap" href={resultUrl} download={result.name} label={result.count === 1 ? 'Download JPG' : 'Download all JPGs'} />
        </div>
        <AdSlot position="download" />
      </>}
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Output</h2><ImageIcon size={18} aria-hidden="true" /></div>
        <p>One JPG per photo. Multiple JPGs download together in a ZIP.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, FileText, Upload } from 'lucide-react';
import { StandardFonts } from 'pdf-lib';
import { inspectPdf, MAX_TOTAL_BYTES, outputFilename } from '@/lib/pdf';
import { numberPdf, numberPositions } from '@/lib/number-pdf';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

const field = 'block w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm';
const label = 'grid min-w-0 gap-1 text-sm';

export function NumberPdfTool() {
  const input = useRef<HTMLInputElement>(null);
  const settings = useRef<HTMLFormElement>(null);
  const locked = useRef(false);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<{ file: File; count: number }>();
  const [format, setFormat] = useState('{n}');
  const [busy, setBusy] = useState('');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Blob>();
  const [proof, setProof] = useState<{ blob: Blob; page: number }>();
  const previewUrl = useBlobUrl(proof?.blob);
  const downloadUrl = useBlobUrl(result);
  const filename = source ? outputFilename(source.file.name.replace(/\.pdf$/i, '') + '-numbered') : 'numbered.pdf';
  useEffect(() => setReady(true), []);

  function clearOutput() {
    setProof(undefined);
    setResult(undefined);
    setError('');
  }

  async function choose(files: FileList | null) {
    if (!ready || locked.current || !files?.length) return;
    if (files.length !== 1) { setError('Choose one PDF at a time.'); return; }
    const file = files[0];
    if (file.size > MAX_TOTAL_BYTES) { setError('Choose a PDF up to 200 MB.'); return; }
    locked.current = true;
    setBusy('Opening PDF…');
    setError('');
    try {
      const count = await inspectPdf(file);
      clearOutput();
      setSource({ file, count });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open the PDF.');
    } finally {
      locked.current = false;
      setBusy('');
    }
  }

  async function apply(preview: boolean) {
    if (!source || !settings.current || locked.current || !settings.current.reportValidity()) return;
    const data = new FormData(settings.current);
    locked.current = true;
    setBusy(preview ? 'Rendering preview…' : 'Adding page numbers…');
    setError('');
    try {
      const { bytes, first } = await numberPdf(source.file, {
        first: Number(data.get('first')),
        last: Number(data.get('last')),
        start: Number(data.get('start')),
        skipCover: data.has('cover'),
        facing: data.has('facing'),
        position: Number(data.get('position')),
        margin: Number(data.get('margin')),
        size: Number(data.get('size')),
        font: data.get('font') as StandardFonts,
        color: String(data.get('color')),
        template: format === 'custom' ? String(data.get('template')).trim() : format,
      }, preview);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      if (preview) {
        const { openRenderedPdf, renderRotationPreview } = await import('@/lib/conversions');
        const pdf = await openRenderedPdf(new File([blob], 'preview.pdf'));
        try {
          const rendered = await renderRotationPreview(pdf, 1, 0);
          setProof({ blob: rendered.blob, page: first });
        } finally { await pdf.destroy(); }
      } else setResult(blob);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add page numbers.');
    } finally {
      locked.current = false;
      setBusy('');
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="PDF page numbering workspace" aria-busy={Boolean(busy)}>
      <div className="panel-heading"><h2>Your PDF</h2></div>
      <div className={`drop-zone ${source ? 'is-compact' : ''} ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files); }}>
        <input ref={input} type="file" accept=".pdf,application/pdf" aria-label="Choose PDF" className="sr-only" tabIndex={-1}
          disabled={!ready || Boolean(busy)} onChange={event => { void choose(event.target.files); event.target.value = ''; }} />
        <h3 className="break-all">{source?.file.name ?? 'Choose a PDF to number'}</h3>
        <p>{source ? `${source.count} ${source.count === 1 ? 'page' : 'pages'}` : 'One unlocked PDF up to 200 MB'}</p>
        <button type="button" className="upload-button" disabled={!ready || Boolean(busy)} onClick={() => input.current?.click()}>
          <Upload aria-hidden="true" />{source ? 'Choose another PDF' : 'Select PDF'}
        </button>
      </div>
      {source && <form key={source.file.name + source.count} ref={settings} className="mt-6 grid gap-4"
        onChange={clearOutput} onSubmit={event => { event.preventDefault(); void apply(false); }}>
        <h3 className="text-lg font-medium">Page numbering</h3>
        <fieldset disabled={Boolean(busy)} className="grid min-w-0 gap-4">
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>From page<input className={field} type="number" name="first" min={1} max={source.count} defaultValue={1} required /></label>
            <label className={label}>To page<input className={field} type="number" name="last" min={1} max={source.count} defaultValue={source.count} required /></label>
            <label className={label}>First number<input className={field} type="number" name="start" min={1} max={999999} defaultValue={1} required /></label>
            <label className={label}>Position<select className={field} name="position" defaultValue={4}>
              {numberPositions.map((position, index) => <option value={index} key={position}>{position}</option>)}
            </select></label>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <label className="flex min-h-10 items-center gap-2"><input name="cover" type="checkbox" /> Skip the cover page</label>
            <label className="flex min-h-10 items-center gap-2"><input name="facing" type="checkbox" /> Mirror even pages</label>
          </div>
          <label className={label}>Number format<select className={field} value={format} onChange={event => setFormat(event.target.value)}>
            <option value="{n}">1</option><option value="Page {n}">Page 1</option>
            <option value="Page {n} of {p}">Page 1 of 10 (PDF total)</option>
            <option value={'{n} / {rf}'}>1 / 10 (last printed number)</option>
            <option value="custom">Custom</option>
          </select></label>
          {format === 'custom' && <label className={label}>Custom format<input className={field} name="template" maxLength={90} defaultValue="Page {n} of {p}" required />
            <span>{'{n}'} current number · {'{p}'} PDF pages · {'{r}'} numbered pages · {'{rf}'} last printed number</span>
          </label>}
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Font<select className={field} name="font">
              <option value={StandardFonts.Helvetica}>Sans serif</option><option value={StandardFonts.TimesRoman}>Serif</option><option value={StandardFonts.Courier}>Monospace</option>
            </select></label>
            <label className={label}>Font size (pt)<input className={field} type="number" name="size" min={6} max={72} defaultValue={12} required /></label>
            <label className={label}>Margin (pt)<input className={field} type="number" name="margin" min={0} max={144} defaultValue={24} required /></label>
            <label className={label}>Text color<input className={field + ' h-10'} name="color" type="color" defaultValue="#263244" /></label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="secondary-action" onClick={() => void apply(true)}><Eye size={18} aria-hidden="true" /> Preview numbers</button>
            <button type="submit" className="primary">Add page numbers</button>
          </div>
        </fieldset>
      </form>}
      {busy && <p className="mt-4 text-sm" role="status">{busy}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {previewUrl && proof && <figure className="mt-4 grid justify-items-center gap-2 rounded-lg bg-neutral-100 p-4">
        <img className="max-h-[320px] max-w-full bg-white object-contain shadow-sm" src={previewUrl} alt={`Numbered preview of PDF page ${proof.page}`} />
        <figcaption className="text-sm">Preview of PDF page {proof.page}</figcaption>
      </figure>}
      {downloadUrl && <><div className="result">
        <div><h3>Your numbered PDF is ready</h3><p className="break-all">{filename}</p></div>
        <DownloadButton href={downloadUrl} download={filename} label="Download PDF" />
      </div><AdSlot position="download" /></>}
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Output</h2><FileText size={18} aria-hidden="true" /></div>
        <p>A new PDF with visible page numbers. Your file stays on this device.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

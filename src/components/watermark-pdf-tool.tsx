'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, FileText, Upload } from 'lucide-react';
import { StandardFonts } from 'pdf-lib';
import { inspectPdf, MAX_TOTAL_BYTES, outputFilename } from '@/lib/pdf';
import { watermarkPdf, watermarkPositions, type WatermarkOptions } from '@/lib/watermark-pdf';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

const field = 'block w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm';
const label = 'grid min-w-0 gap-1 text-sm';

export function WatermarkPdfTool() {
  const input = useRef<HTMLInputElement>(null);
  const settings = useRef<HTMLFormElement>(null);
  const locked = useRef(false);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<{ file: File; count: number }>();
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [repeat, setRepeat] = useState(false);
  const [busy, setBusy] = useState('');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Blob>();
  const [proof, setProof] = useState<{ blob: Blob; page: number }>();
  const previewUrl = useBlobUrl(proof?.blob);
  const downloadUrl = useBlobUrl(result);
  const filename = source ? outputFilename(source.file.name.replace(/\.pdf$/i, '') + '-watermarked') : 'watermarked.pdf';
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
    const image = data.get('image');
    if (mode === 'image' && (!(image instanceof File) || !image.size)) { setError('Choose a PNG or JPEG watermark.'); return; }
    const options: WatermarkOptions = {
      stamp: mode === 'image' ? { image: image as File }
        : { text: String(data.get('text')), color: String(data.get('color')), font: data.get('font') as StandardFonts },
      position: Number(data.get('position')),
      size: Number(data.get('size')),
      opacity: Number(data.get('opacity')),
      angle: Number(data.get('angle')),
      first: Number(data.get('first')),
      last: Number(data.get('last')),
      layer: data.get('layer') === 'under' ? 'under' : 'over',
      repeat,
    };
    locked.current = true;
    setBusy(preview ? 'Rendering preview…' : 'Adding watermark…');
    setError('');
    try {
      const bytes = await watermarkPdf(source.file, options, preview);
      const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
      if (preview) {
        const { openRenderedPdf, renderRotationPreview } = await import('@/lib/conversions');
        const pdf = await openRenderedPdf(new File([blob], 'preview.pdf'));
        try {
          const rendered = await renderRotationPreview(pdf, 1, 0);
          setProof({ blob: rendered.blob, page: options.first });
        } finally { await pdf.destroy(); }
      } else setResult(blob);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not apply the watermark.');
    } finally {
      locked.current = false;
      setBusy('');
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="Watermark PDF workspace" aria-busy={Boolean(busy)}>
      <div className="panel-heading"><h2>Your PDF</h2></div>
      <div className={`drop-zone ${source ? 'is-compact' : ''} ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files); }}>
        <input ref={input} type="file" accept=".pdf,application/pdf" aria-label="Choose PDF" className="sr-only" tabIndex={-1}
          disabled={!ready || Boolean(busy)} onChange={event => { void choose(event.target.files); event.target.value = ''; }} />
        <h3 className="break-all">{source?.file.name ?? 'Choose a PDF to watermark'}</h3>
        <p>{source ? `${source.count} ${source.count === 1 ? 'page' : 'pages'}` : 'One unlocked PDF up to 200 MB'}</p>
        <button type="button" className="upload-button" disabled={!ready || Boolean(busy)} onClick={() => input.current?.click()}>
          <Upload aria-hidden="true" />{source ? 'Choose another PDF' : 'Select PDF'}
        </button>
      </div>
      {source && <form key={source.file.name + source.count} ref={settings} className="mt-6 grid gap-4"
        onChange={clearOutput} onSubmit={event => { event.preventDefault(); void apply(false); }}>
        <h3 className="text-lg font-medium">Watermark settings</h3>
        <fieldset disabled={Boolean(busy)} className="grid min-w-0 gap-4">
          <label className={label}>Watermark type<select className={field} value={mode} onChange={event => setMode(event.target.value === 'image' ? 'image' : 'text')}>
            <option value="text">Text</option><option value="image">Image</option>
          </select></label>
          {mode === 'text' ? <>
            <label className={label}>Watermark text<input className={field} name="text" required maxLength={100} placeholder="DRAFT" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>Font<select className={field} name="font">
                <option value={StandardFonts.HelveticaBold}>Sans serif</option><option value={StandardFonts.TimesRomanBold}>Serif</option><option value={StandardFonts.CourierBold}>Monospace</option>
              </select></label>
              <label className={label}>Text color<input className={field + ' h-10'} name="color" type="color" defaultValue="#263244" /></label>
            </div>
          </> : <label className={label}>Watermark image (PNG or JPEG)<input className={field} type="file" name="image" accept="image/png,image/jpeg" required /></label>}
          <div className="grid grid-cols-2 gap-3">
            <label className={label}>Opacity (%)<input className={field} type="number" name="opacity" defaultValue={25} min={1} max={100} required /></label>
            <label className={label}>Size (%)<input className={field} type="number" name="size" defaultValue={55} min={5} max={88} required /></label>
            <label className={label}>Rotation<select className={field} name="angle" defaultValue={45}>
              {[0, 45, 90, -45, -90, 180].map(angle => <option value={angle} key={angle}>{angle}°</option>)}
            </select></label>
            <label className={label}>Layer<select className={field} name="layer">
              <option value="over">Over content</option><option value="under">Under content</option>
            </select></label>
            <label className={label}>From page<input className={field} type="number" name="first" min={1} max={source.count} defaultValue={1} required /></label>
            <label className={label}>To page<input className={field} type="number" name="last" min={1} max={source.count} defaultValue={source.count} required /></label>
          </div>
          <label className={label}>Position<select className={field} name="position" defaultValue={4} disabled={repeat}>
            {watermarkPositions.map((position, index) => <option value={index} key={position}>{position}</option>)}
          </select></label>
          <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={repeat} onChange={event => setRepeat(event.target.checked)} /> Repeat across the page</label>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="secondary-action" onClick={() => void apply(true)}><Eye size={18} aria-hidden="true" /> Preview watermark</button>
            <button type="submit" className="primary">Add watermark</button>
          </div>
        </fieldset>
      </form>}
      {busy && <p className="mt-4 text-sm" role="status">{busy}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {previewUrl && proof && <figure className="mt-4 grid justify-items-center gap-2 rounded-lg bg-neutral-100 p-4">
        <img className="max-h-[320px] max-w-full bg-white object-contain shadow-sm" src={previewUrl} alt={`Watermarked preview of page ${proof.page}`} />
        <figcaption className="text-sm">Preview of page {proof.page}</figcaption>
      </figure>}
      {downloadUrl && <><div className="result">
        <div><h3>Your watermarked PDF is ready</h3><p className="break-all">{filename}</p></div>
        <DownloadButton href={downloadUrl} download={filename} label="Download PDF" />
      </div><AdSlot position="download" /></>}
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Output</h2><FileText size={18} aria-hidden="true" /></div>
        <p>A new PDF with your watermark. Your document stays on this device.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

'use client';

import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Crop, Upload } from 'lucide-react';
import { cropWithinImage, exportCrop, type CropRect } from '@/lib/crop-image';
import { OUTPUT_PIXEL_LIMIT, readImage, renderImage, type ImageFormat } from '@/lib/image-processing';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

const fields = { x: 'Position X (px)', y: 'Position Y (px)', width: 'Width (px)', height: 'Height (px)' } as const;
const formats = { 'image/jpeg': 'JPG', 'image/png': 'PNG', 'image/webp': 'WebP' } as const;
const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
const fieldStyle = 'block w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm';
type CropField = keyof CropRect;
type Point = { x: number; y: number };
type Source = { name: string; width: number; height: number; preview: Blob };

export function CropImageTool() {
  const input = useRef<HTMLInputElement>(null);
  const bitmap = useRef<ImageBitmap | null>(null);
  const mounted = useRef(false);
  const locked = useRef(false);
  const drag = useRef<{ id: number; start: Point } | null>(null);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<Source>();
  const [values, setValues] = useState<Record<CropField, string>>({ x: '0', y: '0', width: '', height: '' });
  const [format, setFormat] = useState<ImageFormat>('image/png');
  const [busy, setBusy] = useState('');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Blob>();
  const previewUrl = useBlobUrl(source?.preview);
  const downloadUrl = useBlobUrl(result);
  const rect = { x: Number(values.x), y: Number(values.y), width: Number(values.width), height: Number(values.height) };
  const within = !!source && Object.values(values).every(value => value.trim() !== '') && cropWithinImage(rect, source);
  const tooLarge = within && (rect.width > 8192 || rect.height > 8192 || rect.width * rect.height > OUTPUT_PIXEL_LIMIT);
  const filename = source ? source.name.replace(/\.[^.]+$/, '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').slice(0, 110) + '-cropped.' + extensions[format] : '';

  useEffect(() => {
    mounted.current = true;
    setReady(true);
    return () => {
      mounted.current = false;
      bitmap.current?.close();
      bitmap.current = null;
    };
  }, []);

  function setRect(next: CropRect) {
    setValues({ x: String(next.x), y: String(next.y), width: String(next.width), height: String(next.height) });
    setResult(undefined);
    setError('');
  }

  async function choose(files: FileList | null) {
    if (!ready || locked.current || !files?.length) return;
    if (files.length !== 1) { setError('Choose one image at a time.'); return; }
    const file = files[0];
    locked.current = true;
    setBusy('Opening image…');
    setError('');
    let incoming: ImageBitmap | undefined;
    try {
      const decoded = await readImage(file);
      incoming = decoded.image;
      const { width, height } = incoming;
      const scale = Math.min(1, 1000 / Math.max(width, height));
      const preview = await renderImage(incoming, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), 'image/png');
      if (!mounted.current) return;
      bitmap.current?.close();
      bitmap.current = incoming;
      incoming = undefined;
      setSource({ name: file.name, width, height, preview });
      setFormat(decoded.format);
      setRect({ x: 0, y: 0, width, height });
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not open the image.');
    } finally {
      incoming?.close();
      locked.current = false;
      if (mounted.current) setBusy('');
    }
  }

  function point(event: PointerEvent<HTMLDivElement>, image: Source) {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(image.width, Math.max(0, Math.round((event.clientX - bounds.left) * image.width / bounds.width))),
      y: Math.min(image.height, Math.max(0, Math.round((event.clientY - bounds.top) * image.height / bounds.height))),
    };
  }

  function updateDrag(event: PointerEvent<HTMLDivElement>) {
    if (!source || drag.current?.id !== event.pointerId) return;
    const { start } = drag.current;
    const end = point(event, source);
    if (start.x === end.x || start.y === end.y) return;
    setRect({ x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(start.x - end.x), height: Math.abs(start.y - end.y) });
  }

  async function save() {
    if (!bitmap.current || !within || tooLarge || locked.current) return;
    locked.current = true;
    setBusy('Cropping image…');
    setError('');
    try {
      const output = await exportCrop(bitmap.current, rect, format);
      if (mounted.current) setResult(output);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not crop this image.');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy('');
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="Crop image workspace" aria-busy={Boolean(busy)}>
      <div className="panel-heading"><h2>Your image</h2></div>
      <div className={`drop-zone ${source ? 'is-compact' : ''} ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files); }}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose image" className="sr-only" tabIndex={-1}
          disabled={!ready || Boolean(busy)} onChange={event => { void choose(event.target.files); event.target.value = ''; }} />
        <h3 className="break-all">{source?.name ?? 'Choose an image to crop'}</h3>
        <p>{source ? `${source.width} × ${source.height} px` : 'One JPG, PNG, or WebP up to 50 MB'}</p>
        <button type="button" className="upload-button" disabled={!ready || Boolean(busy)} onClick={() => input.current?.click()}>
          <Upload aria-hidden="true" />{source ? 'Choose another image' : 'Select image'}
        </button>
      </div>
      {source && previewUrl && <div className="mt-5 grid min-w-0 gap-4">
        <p className="text-sm">Drag over the image to select what to keep, or enter exact pixel values.</p>
        <div className="flex min-w-0 justify-center overflow-hidden rounded-lg bg-neutral-100 p-3">
          <div className="relative inline-block max-w-full cursor-crosshair touch-none select-none overflow-hidden"
            data-testid="crop-preview"
            onPointerDown={event => {
              if (locked.current || !event.isPrimary || event.button !== 0) return;
              drag.current = { id: event.pointerId, start: point(event, source) };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={updateDrag}
            onPointerUp={event => { updateDrag(event); drag.current = null; }}
            onPointerCancel={() => { drag.current = null; }}
            onLostPointerCapture={() => { drag.current = null; }}>
            <img className="block max-h-[420px] max-w-full" src={previewUrl} alt="Image crop preview" draggable={false} />
            {within && <div className="pointer-events-none absolute border-2 border-white outline outline-1 outline-black shadow-[0_0_0_1500px_rgba(0,0,0,.48)]"
              style={{ left: `${rect.x / source.width * 100}%`, top: `${rect.y / source.height * 100}%`, width: `${rect.width / source.width * 100}%`, height: `${rect.height / source.height * 100}%` }} />}
          </div>
        </div>
        <fieldset disabled={Boolean(busy)} className="grid min-w-0 gap-4">
          <div className="grid grid-cols-2 gap-3">
            {(Object.keys(fields) as CropField[]).map(key => <label key={key} className="grid min-w-0 gap-1 text-sm">{fields[key]}
              <input type="number" step={1} min={key === 'x' || key === 'y' ? 0 : 1} className={fieldStyle} value={values[key]}
                onChange={event => { setValues({ ...values, [key]: event.target.value }); setResult(undefined); setError(''); }} />
            </label>)}
          </div>
          <label className="grid gap-1 text-sm">Output format
            <select value={format} className={fieldStyle} onChange={event => { setFormat(event.target.value as ImageFormat); setResult(undefined); setError(''); }}>
              {Object.entries(formats).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </label>
          {!within && <p className="text-sm" role="status">Enter whole pixels and keep the selection within the image.</p>}
          {tooLarge && <p className="text-sm" role="status">Select up to 16 megapixels and 8192 pixels per side.</p>}
          <div className="flex flex-wrap gap-3">
            <button type="button" className="secondary-action" onClick={() => setRect({ x: 0, y: 0, width: source.width, height: source.height })}>Reset selection</button>
            <button type="button" className="primary" disabled={!within || tooLarge} onClick={() => void save()}><Crop size={18} aria-hidden="true" /> Crop image</button>
          </div>
        </fieldset>
      </div>}
      {busy && <p className="mt-4 text-sm" role="status">{busy}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {downloadUrl && <><div className="result">
        <div><h3>Your crop is ready</h3><p>{rect.width} × {rect.height} px</p></div>
        <DownloadButton href={downloadUrl} download={filename} label="Download image" />
      </div><AdSlot position="download" /></>}
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Output</h2><Crop size={18} aria-hidden="true" /></div>
        <dl className="document-stats">
          <div><dt>Dimensions</dt><dd>{within ? `${rect.width} × ${rect.height} px` : '—'}</dd></div>
          <div><dt>Format</dt><dd>{formats[format]}</dd></div>
        </dl>
        <p>Your image stays in your browser.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, RotateCcw, RotateCw, Trash2, Upload } from 'lucide-react';
import { imageDimensions, readImage, renderImage, type ImageFormat } from '@/lib/image-processing';
import { rotateImagesZip, rotatedImageName } from '@/lib/rotate-image-download';
import { exportRotatedImage } from '@/lib/rotate-image';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

type Entry = { file: File; preview: Blob; format: ImageFormat; angle: number; width: number; height: number };

function ImagePreview({ entry }: { entry: Entry }) {
  const url = useBlobUrl(entry.preview);
  return <div className="grid h-28 w-28 shrink-0 place-items-center overflow-hidden rounded-lg bg-neutral-100">
    {url && <img src={url} alt={`Rotation preview of ${entry.file.name}`} className="max-h-24 max-w-24 object-contain" style={{ transform: `rotate(${entry.angle}deg)` }} />}
  </div>;
}

export function RotateImageTool() {
  const picker = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const locked = useRef(false);
  const [ready, setReady] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [scope, setScope] = useState<'all' | 'portrait' | 'landscape'>('all');
  const [result, setResult] = useState<{ blob: Blob; name: string; count: number }>();
  const downloadUrl = useBlobUrl(result?.blob);
  useEffect(() => {
    mounted.current = true;
    setReady(true);
    return () => { mounted.current = false; };
  }, []);

  function update(next: Entry[]) {
    setEntries(next);
    setResult(undefined);
    setError('');
  }

  async function add(files: File[]) {
    if (!ready || locked.current || !files.length) return;
    const size = [...entries.map(entry => entry.file), ...files].reduce((sum, file) => sum + file.size, 0);
    if (entries.length + files.length > 20 || size > 100 * 1024 * 1024) {
      setError('Choose up to 20 images and 100 MB combined.');
      return;
    }
    locked.current = true;
    setBusy('Opening images…');
    setError('');
    try {
      const added: Entry[] = [];
      for (const file of files) {
        if (!mounted.current) return;
        const { image, format } = await readImage(file);
        try {
          const { width, height } = image;
          imageDimensions(width, height);
          const scale = Math.min(1, 192 / Math.max(width, height));
          const preview = await renderImage(image, Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)), 'image/png');
          added.push({ file, preview, format, angle: 0, width, height });
        } catch (cause) {
          throw new Error(`“${file.name}”: ${cause instanceof Error ? cause.message : 'Could not prepare this image.'}`);
        } finally { image.close(); }
      }
      if (mounted.current) update([...entries, ...added]);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not open the selected images.');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy('');
    }
  }

  function inScope(entry: Entry) {
    if (scope === 'all') return true;
    const sideways = entry.angle % 180 !== 0;
    const width = sideways ? entry.height : entry.width;
    const height = sideways ? entry.width : entry.height;
    return scope === 'portrait' ? height > width : width > height;
  }

  function turn(delta: number, index?: number) {
    update(entries.map((entry, position) => (index === undefined ? inScope(entry) : index === position)
      ? { ...entry, angle: (entry.angle + delta + 360) % 360 }
      : entry));
  }

  async function save() {
    if (locked.current || !entries.some(entry => entry.angle)) return;
    locked.current = true;
    setError('');
    setResult(undefined);
    try {
      const outputs: { blob: Blob; name: string }[] = [];
      let size = 0;
      for (const [index, entry] of entries.entries()) {
        if (!mounted.current) return;
        setBusy(`Preparing image ${index + 1} of ${entries.length}…`);
        let blob: Blob = entry.file;
        if (entry.angle) {
          const { image } = await readImage(entry.file);
          try { blob = await exportRotatedImage(image, entry.format, entry.angle); }
          finally { image.close(); }
        }
        size += blob.size;
        if (size > 200 * 1024 * 1024) throw new Error('Output exceeds 200 MB. Try a smaller batch.');
        outputs.push({ blob, name: rotatedImageName(entry.file, entry.format, entry.angle, entries.length > 1 ? index : undefined) });
      }
      const archive = outputs.length > 1;
      const blob = archive ? await rotateImagesZip(outputs) : outputs[0].blob;
      if (mounted.current) setResult({ blob, name: archive ? 'zipora-rotated-images.zip' : outputs[0].name, count: outputs.length });
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not export the rotated images.');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy('');
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="Rotate image workspace" aria-busy={Boolean(busy)}>
      <div className="panel-heading"><h2>Your images</h2></div>
      <div className={`drop-zone ${entries.length ? 'is-compact' : ''} ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void add(Array.from(event.dataTransfer.files)); }}>
        <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" multiple aria-label="Choose images" className="sr-only" tabIndex={-1}
          disabled={!ready || Boolean(busy)} onChange={event => { void add(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        <h3>{entries.length ? 'Add more images' : 'Choose images to rotate'}</h3>
        <p>JPG, PNG, or WebP · up to 20 images and 100 MB total</p>
        <button type="button" className="upload-button" disabled={!ready || Boolean(busy)} onClick={() => picker.current?.click()}>
          <Upload aria-hidden="true" />{entries.length ? 'Add images' : 'Select images'}
        </button>
      </div>
      {entries.length > 0 && <div className="mt-5 grid min-w-0 gap-4">
        <fieldset disabled={Boolean(busy)} className="flex flex-wrap gap-2">
          {entries.length > 1 && <>
            <label className="grid w-full gap-1 text-sm">Rotate batch
              <select className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2" value={scope} onChange={event => setScope(event.target.value as typeof scope)}>
                <option value="all">All images</option><option value="portrait">Portrait only</option><option value="landscape">Landscape only</option>
              </select>
            </label>
            <button type="button" className="secondary-action" disabled={!entries.some(inScope)} onClick={() => turn(-90)}>Rotate batch left</button>
            <button type="button" className="secondary-action" disabled={!entries.some(inScope)} onClick={() => turn(90)}>Rotate batch right</button>
          </>}
          <button type="button" className="secondary-action" disabled={!entries.some(entry => entry.angle)}
            onClick={() => update(entries.map(entry => ({ ...entry, angle: 0 })))}>Reset rotations</button>
        </fieldset>
        <ul aria-label="Selected images" className="grid gap-3">
          {entries.map((entry, index) => {
            const sideways = entry.angle % 180 !== 0;
            return <li key={`${entry.file.name}-${index}`} className="flex min-w-0 flex-wrap items-start gap-3 rounded-lg border border-neutral-200 p-3">
              <ImagePreview entry={entry} />
              <div className="grid min-w-[120px] flex-1 gap-2">
                <p className="break-all text-sm font-medium">{entry.file.name}</p>
                <p className="text-sm tabular-nums" aria-live="polite">{sideways ? entry.height : entry.width} × {sideways ? entry.width : entry.height} px · {entry.angle}°</p>
                <div className="flex flex-wrap gap-1">
                  <button type="button" className="secondary-action min-h-11 min-w-11 justify-center !p-2" disabled={Boolean(busy)} aria-label={`Rotate ${entry.file.name} left`} title="Rotate left" onClick={() => turn(-90, index)}><RotateCcw size={18} aria-hidden="true" /></button>
                  <button type="button" className="secondary-action min-h-11 min-w-11 justify-center !p-2" disabled={Boolean(busy)} aria-label={`Rotate ${entry.file.name} right`} title="Rotate right" onClick={() => turn(90, index)}><RotateCw size={18} aria-hidden="true" /></button>
                  <button type="button" className="secondary-action min-h-11 min-w-11 justify-center !p-2" disabled={Boolean(busy)} aria-label={`Remove ${entry.file.name}`} title="Remove image" onClick={() => update(entries.filter((_, position) => position !== index))}><Trash2 size={18} aria-hidden="true" /></button>
                </div>
              </div>
            </li>;
          })}
        </ul>
        <button type="button" className="primary" disabled={Boolean(busy) || !entries.some(entry => entry.angle)} onClick={() => void save()}>Save rotated images</button>
      </div>}
      {busy && <p className="mt-4 text-sm" role="status">{busy}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {result && downloadUrl && <>
        <div className="result flex-col sm:flex-row">
          <div><h3>{result.count === 1 ? 'Your rotated image is ready' : 'Your images are ready'}</h3></div>
          <DownloadButton className="shrink-0 whitespace-nowrap" href={downloadUrl} download={result.name} label={result.count === 1 ? 'Download image' : 'Download all images'} />
        </div>
        <AdSlot position="download" />
      </>}
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Output</h2><ImageIcon size={18} aria-hidden="true" /></div>
        <p>Keep each image’s format. Download one image or a ZIP for a batch.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

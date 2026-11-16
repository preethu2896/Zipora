'use client';

import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { exportCrop } from '@/lib/crop-image';
import { OUTPUT_PIXEL_LIMIT, readImage } from '@/lib/image-processing';
import { useBlobUrl } from './use-blob-url';

type Source = { file: File; width: number; height: number };
type Part = { name: string; blob: Blob };

function TileDownload({ part, number }: { part: Part; number: number }) {
  const url = useBlobUrl(part.blob);
  return url && <a className="secondary-action" href={url} download={part.name}>Download tile {number}</a>;
}

export function SplitImageTool() {
  const input = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const [source, setSource] = useState<Source>();
  const [rows, setRows] = useState(1);
  const [columns, setColumns] = useState(2);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ parts: Part[]; zip: Blob }>();
  const preview = useBlobUrl(source?.file);
  const zipUrl = useBlobUrl(result?.zip);

  const tiles = source ? Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const x = Math.floor(column * source.width / columns);
    const y = Math.floor(row * source.height / rows);
    return {
      x, y,
      width: Math.floor((column + 1) * source.width / columns) - x,
      height: Math.floor((row + 1) * source.height / rows) - y,
    };
  }) : [];
  const tooLarge = tiles.some(({ width, height }) => width > 8192 || height > 8192 || width * height > OUTPUT_PIXEL_LIMIT);

  async function choose(file?: File) {
    if (!file || locked.current) return;
    locked.current = true;
    setBusy('Reading image…');
    setError('');
    setSource(undefined);
    setResult(undefined);
    try {
      const { image } = await readImage(file);
      setSource({ file, width: image.width, height: image.height });
      setRows(image.width > 1 ? 1 : Math.min(image.height, 2));
      setColumns(Math.min(image.width, 2));
      image.close();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open this image.');
    } finally {
      locked.current = false;
      setBusy('');
    }
  }

  async function split() {
    if (!source || tiles.length < 2 || tooLarge || locked.current) return;
    locked.current = true;
    setBusy('Splitting image…');
    setError('');
    setResult(undefined);
    try {
      const { default: JSZip } = await import('jszip');
      const { image } = await readImage(source.file);
      const archive = new JSZip();
      const parts: Part[] = [];
      try {
        for (const [index, tile] of tiles.entries()) {
          const blob = await exportCrop(image, tile, 'image/png');
          const name = `tile-${String(index + 1).padStart(2, '0')}.png`;
          archive.file(name, blob);
          parts.push({ name, blob });
        }
      } finally {
        image.close();
      }
      setResult({ parts, zip: await archive.generateAsync({ type: 'blob' }) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not split this image.');
    } finally {
      locked.current = false;
      setBusy('');
    }
  }

  return <div className="workspace"><section className="tool-panel" aria-label="Image splitter" aria-busy={Boolean(busy)}>
    <div className={`drop-zone ${source ? 'is-compact' : ''}`}
      onDragOver={event => event.preventDefault()}
      onDrop={event => { event.preventDefault(); void choose(event.dataTransfer.files[0]); }}>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose image"
        className="sr-only" tabIndex={-1} disabled={Boolean(busy)}
        onChange={event => { void choose(event.target.files?.[0]); event.target.value = ''; }} />
      <h2 className="break-all">{source?.file.name ?? 'Choose an image to split'}</h2>
      <p>{source ? `${source.width} × ${source.height} px` : 'Drop one JPG, PNG or WebP up to 50 MB'}</p>
      <button className="upload-button" type="button" disabled={Boolean(busy)} onClick={() => input.current?.click()}>
        <Upload aria-hidden="true" />{source ? 'Choose another image' : 'Select image'}
      </button>
    </div>
    {source && preview && <div className="mt-5 grid gap-4">
      <fieldset className="grid max-w-xs grid-cols-2 gap-3" disabled={Boolean(busy)}>
        {[
          { label: 'Rows', value: rows, max: source.height, set: setRows },
          { label: 'Columns', value: columns, max: source.width, set: setColumns },
        ].map(({ label, value, max, set }) => <label className="grid gap-1 text-sm" key={label}>{label}
          <select className="rounded-lg border border-current/20 bg-transparent p-2" value={value}
            onChange={event => { set(Number(event.target.value)); setResult(undefined); setError(''); }}>
            {Array.from({ length: Math.min(10, max) }, (_, index) => <option key={index + 1}>{index + 1}</option>)}
          </select>
        </label>)}
      </fieldset>
      <div className="flex min-w-0 justify-center">
        <div className="relative inline-block max-w-full overflow-hidden rounded-lg">
          <img className="block max-h-[420px] max-w-full" src={preview} alt="Image with split grid preview" />
          {tiles.map(({ x, y, width, height }, index) => <div key={index} aria-hidden="true"
            className="pointer-events-none absolute border border-white outline outline-black/60"
            style={{ left: `${x / source.width * 100}%`, top: `${y / source.height * 100}%`, width: `${width / source.width * 100}%`, height: `${height / source.height * 100}%` }} />)}
        </div>
      </div>
      <p className="text-sm">{tooLarge ? 'Add rows or columns to keep each tile within 8192 pixels per side and 16 megapixels.' : `${tiles.length} PNG ${tiles.length === 1 ? 'tile' : 'tiles'} · Numbered left to right, top to bottom`}</p>
      <div><button className="primary" type="button" disabled={Boolean(busy) || tiles.length < 2 || tooLarge} onClick={() => void split()}>Split image</button></div>
    </div>}
    {busy && <p role="status" className="mt-4">{busy}</p>}
    {error && <p role="alert" className="error-message">{error}</p>}
    {result && zipUrl && <div className="mt-5 grid gap-3">
      <div className="result">
        <h3>{result.parts.length} tiles ready</h3>
        <a className="primary" href={zipUrl} download="image-tiles.zip">Download all as ZIP</a>
      </div>
      <div className="flex flex-wrap gap-2">{result.parts.map((part, index) => <TileDownload key={part.name} part={part} number={index + 1} />)}</div>
    </div>}
  </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Output</h2></div>
        <dl className="document-stats">
          <div><dt>Tiles</dt><dd>{source ? tiles.length : '—'}</dd></div>
          <div><dt>Format</dt><dd>PNG</dd></div>
        </dl>
        <p>Your image stays in your browser.</p>
      </aside>
    </div>
  </div>;
}

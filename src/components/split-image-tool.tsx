'use client';

import { Download, Upload } from 'lucide-react';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { exportCrop, type CropRect } from '@/lib/crop-image';
import { canvasBlob, OUTPUT_PIXEL_LIMIT, readImage, type ImageFormat } from '@/lib/image-processing';
import { useBlobUrl } from './use-blob-url';

type Direction = 'Vertical' | 'Horizontal' | 'Grid';
type Source = { file: File; width: number; height: number };

const directions: Direction[] = ['Vertical', 'Horizontal', 'Grid'];
const maxPieces = 20;
const tileNumber = (index: number) => String(index + 1).padStart(2, '0');
const panelStyle = 'rounded-xl border border-[var(--line)] bg-[var(--paper)] p-4 sm:p-6';
const fieldStyle = 'rounded-lg border border-[var(--line)] bg-[var(--paper)] px-3 py-2';

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

function TilePreview({ tile, source, url }: { tile: CropRect; source: Source; url: string }) {
  return <span aria-hidden="true" className="block w-full bg-no-repeat" style={{
    aspectRatio: `${tile.width} / ${tile.height}`,
    backgroundImage: `url("${url}")`,
    backgroundSize: `${source.width / tile.width * 100}% ${source.height / tile.height * 100}%`,
    backgroundPosition: `${source.width === tile.width ? 0 : tile.x / (source.width - tile.width) * 100}% ${source.height === tile.height ? 0 : tile.y / (source.height - tile.height) * 100}%`,
  }} />;
}

export function SplitImageTool() {
  const input = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<Source>();
  const [direction, setDirection] = useState<Direction>('Vertical');
  const [pieces, setPieces] = useState('4');
  const [gridRows, setGridRows] = useState(2);
  const [gridColumns, setGridColumns] = useState(2);
  const [format, setFormat] = useState<ImageFormat>('image/png');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<number>();
  const preview = useBlobUrl(source?.file);
  const maxStrips = Math.min(maxPieces, (direction === 'Horizontal' ? source?.height : source?.width) ?? maxPieces);
  const stripCount = Math.min(maxStrips, Math.max(2, Math.trunc(Number(pieces)) || 2));
  const rows = direction === 'Grid' ? gridRows : direction === 'Horizontal' ? stripCount : 1;
  const columns = direction === 'Grid' ? gridColumns : direction === 'Vertical' ? stripCount : 1;
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
  const extension = format === 'image/png' ? 'png' : 'jpg';
  const filename = (index: number) => `${tileNumber(index)}.${extension}`;
  const disabled = Boolean(busy) || tooLarge;

  async function choose(load: () => File | Promise<File>, sample = false) {
    if (locked.current) return;
    locked.current = true;
    setBusy('Reading image…');
    setError('');
    try {
      const file = await load();
      const { image } = await readImage(file);
      const { width, height } = image;
      image.close();
      if (width * height < 2) throw new Error('Choose an image with at least two pixels.');
      setSource({ file, width, height });
      setDirection(width > 1 ? 'Vertical' : 'Horizontal');
      setPieces(String(Math.min(sample ? maxPieces : 4, width > 1 ? width : height)));
      setGridRows(Math.min(height, 2));
      setGridColumns(Math.min(width, 2));
      setSelected(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open this image.');
    } finally {
      locked.current = false;
      setBusy('');
    }
  }

  const pasteImage = useEffectEvent((event: ClipboardEvent) => {
    if (event.target instanceof Element && event.target.closest('input, textarea, [contenteditable]')) return;
    const file = Array.from(event.clipboardData?.files ?? []).find(item => item.type.startsWith('image/'));
    if (!file) return;
    event.preventDefault();
    void choose(() => file);
  });

  useEffect(() => {
    setReady(true);
    const handlePaste = (event: ClipboardEvent) => pasteImage(event);
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  async function loadSample() {
    const response = await fetch('/home-compression-sample.png');
    if (!response.ok) throw new Error('Could not load the sample. Try selecting an image instead.');
    const bitmap = await createImageBitmap(await response.blob());
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = Math.round(bitmap.width * 0.375);
    try {
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Your browser could not prepare the sample.');
      context.drawImage(bitmap, 0, Math.floor((bitmap.height - canvas.height) / 2), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
      return new File([await canvasBlob(canvas, 'image/png')], 'zipora-sample-panorama.png', { type: 'image/png' });
    } finally {
      bitmap.close();
      canvas.width = canvas.height = 0;
    }
  }

  async function download(index?: number) {
    if (!source || disabled || locked.current) return;
    locked.current = true;
    setError('');
    setBusy(index === undefined ? 'Preparing ZIP…' : `Preparing ${filename(index)}…`);
    try {
      const { image } = await readImage(source.file);
      try {
        if (index !== undefined) {
          saveBlob(await exportCrop(image, tiles[index], format), filename(index));
          return;
        }
        const { default: JSZip } = await import('jszip');
        const zip = new JSZip();
        for (const [i, tile] of tiles.entries()) {
          setBusy(`Preparing tile ${i + 1} of ${tiles.length}…`);
          zip.file(filename(i), await exportCrop(image, tile, format));
        }
        saveBlob(await zip.generateAsync({ type: 'blob' }), 'image-tiles.zip');
      } finally {
        image.close();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not export the tiles.');
    } finally {
      locked.current = false;
      setBusy('');
    }
  }

  function changePieces(value: string) {
    setPieces(value);
    setSelected(undefined);
  }

  return <section className={panelStyle} aria-label="Image splitter"
    onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
    onDragLeave={event => {
      if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false);
    }}
    onDrop={event => {
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files[0];
      if (file) void choose(() => file);
    }}>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose image"
      className="sr-only" tabIndex={-1} disabled={!ready || Boolean(busy)}
      onChange={event => {
        const file = event.target.files?.[0];
        if (file) void choose(() => file);
        event.target.value = '';
      }} />
    {!source || !preview ? <div className="grid justify-items-center gap-4">
      <button type="button" disabled={!ready || Boolean(busy)} onClick={() => input.current?.click()}
        className={`flex min-h-72 w-full flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-4 text-center sm:min-h-88 ${dragging ? 'border-[var(--blue)]' : 'border-[var(--line)]'} bg-[var(--surface)] hover:border-[var(--blue)]`}>
        <span className="rounded-xl border border-[var(--line)] bg-[var(--paper)] p-3"><Upload aria-hidden="true" /></span>
        <span className="text-xl font-semibold">Drop an image here</span>
        <span className="text-sm text-[var(--muted)]">PNG, JPG or WebP up to 50 MB. Browse or paste from your clipboard.</span>
        <span className="rounded-full bg-[var(--blue)] px-4 py-2 font-medium text-white">Browse files</span>
      </button>
      <button type="button" className="secondary-action" disabled={!ready || Boolean(busy)} onClick={() => void choose(loadSample, true)}>Try sample panorama</button>
    </div> : <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
        <div className="min-w-0"><h2 className="break-all font-semibold">{source.file.name}</h2><p className="text-[var(--muted)]">{source.width} × {source.height} px</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="secondary-action" disabled={Boolean(busy)} onClick={() => input.current?.click()}>Replace</button>
          <button type="button" className="secondary-action" disabled={Boolean(busy)} onClick={() => { setSource(undefined); setError(''); }}>Remove</button>
        </div>
      </div>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <fieldset className="grid min-w-0 gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4" disabled={Boolean(busy)} aria-label="Split settings">
          <div><h3 className="mb-2 font-semibold">Direction</h3>
            <div className="flex flex-wrap gap-1">{directions.map(mode => <button type="button" key={mode}
              disabled={(mode === 'Vertical' && source.width < 2) || (mode === 'Horizontal' && source.height < 2) || (mode === 'Grid' && (source.width < 2 || source.height < 2))}
              aria-pressed={direction === mode} className={direction === mode ? 'primary' : 'secondary-action'}
              onClick={() => {
                setDirection(mode);
                if (mode !== 'Grid') changePieces(String(Math.min(stripCount, mode === 'Vertical' ? source.width : source.height)));
                setSelected(undefined);
              }}>{mode}</button>)}</div>
          </div>
          {direction === 'Grid' ? <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">Rows<select className={fieldStyle} value={gridRows} onChange={e => { setGridRows(Number(e.target.value)); setSelected(undefined); }}>
              {Array.from({ length: Math.min(source.height, Math.floor(maxPieces / gridColumns)) - 1 }, (_, i) => <option key={i + 2}>{i + 2}</option>)}
            </select></label>
            <label className="grid gap-1">Columns<select className={fieldStyle} value={gridColumns} onChange={e => { setGridColumns(Number(e.target.value)); setSelected(undefined); }}>
              {Array.from({ length: Math.min(source.width, Math.floor(maxPieces / gridRows)) - 1 }, (_, i) => <option key={i + 2}>{i + 2}</option>)}
            </select></label>
          </div> : <div>
            <label htmlFor="split-piece-count" className="mb-2 block font-semibold">Pieces</label>
            <div className="flex items-center gap-2">
              <button type="button" className="secondary-action" aria-label="Fewer pieces" disabled={stripCount <= 2} onClick={() => changePieces(String(stripCount - 1))}>−</button>
              <input id="split-piece-count" aria-label="Piece count" className={`${fieldStyle} w-20`} type="number" min={2} max={maxStrips}
                value={pieces} onChange={e => changePieces(e.target.value)} onBlur={() => changePieces(String(stripCount))} />
              <button type="button" className="secondary-action" aria-label="More pieces" disabled={stripCount >= maxStrips} onClick={() => changePieces(String(stripCount + 1))}>+</button>
            </div>
          </div>}
          <div><h3 className="mb-2 font-semibold">Export</h3>
            <div className="flex gap-1">
              {(['image/png', 'image/jpeg'] as const).map(option => <button key={option} type="button"
                aria-pressed={format === option} className={format === option ? 'primary' : 'secondary-action'}
                onClick={() => setFormat(option)}>{option === 'image/png' ? 'PNG' : 'JPEG'}</button>)}
            </div>
          </div>
          <p className="text-sm text-[var(--muted)]">{rows} × {columns} · {tiles.length} pieces. {format === 'image/png' ? 'PNG preserves transparency.' : 'JPEG fills transparent areas with white.'}</p>
        </fieldset>
        <div className="grid min-w-0 gap-4">
          <div className="flex justify-center rounded-xl bg-[var(--surface)] p-3">
            <div className="relative inline-block max-w-full self-center overflow-hidden rounded-lg">
              <img className="block max-h-[420px] max-w-full" src={preview} alt="Image with split grid preview" />
              {tiles.map(({ x, y, width, height }, i) => <div key={i} aria-hidden="true"
                className={`pointer-events-none absolute border border-white/80 ${selected === i ? 'bg-blue-500/25 ring-2 ring-inset ring-blue-500' : ''}`}
                style={{ left: `${x / source.width * 100}%`, top: `${y / source.height * 100}%`, width: `${width / source.width * 100}%`, height: `${height / source.height * 100}%` }} />)}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Numbered pieces</h3>
            <button className="primary" type="button" disabled={disabled} onClick={() => void download()}><Download size={16} aria-hidden="true" /> Download all {tiles.length} as ZIP</button>
          </div>
          {tooLarge && <p className="error-message">Add rows or columns to keep each tile within 8192 pixels per side and 16 megapixels.</p>}
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {tiles.map((tile, i) => <li key={i} className="min-w-0 overflow-hidden rounded-lg border border-[var(--line)]">
              <button type="button" className="flex h-16 w-full items-center justify-center overflow-hidden bg-[var(--surface)]"
                aria-label={`Inspect ${filename(i)}`} aria-pressed={selected === i} onClick={() => setSelected(i)}>
                <TilePreview tile={tile} source={source} url={preview} />
              </button>
              <button className="flex w-full items-center justify-between gap-1 px-2 py-2 text-xs hover:bg-[var(--surface)]" type="button"
                aria-label={`Download tile ${i + 1}`} disabled={disabled} onClick={() => void download(i)}>
                {filename(i)} <Download size={13} aria-hidden="true" />
              </button>
            </li>)}
          </ul>
          {selected !== undefined && <p role="status" className="text-sm">{filename(selected)} · {tiles[selected].width} × {tiles[selected].height} px</p>}
        </div>
      </div>
    </div>}
    {busy && <p role="status" className="mt-4">{busy}</p>}
    {error && <p role="alert" className="error-message">{error}</p>}
  </section>;
}

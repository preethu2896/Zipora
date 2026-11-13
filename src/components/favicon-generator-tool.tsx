'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, Upload } from 'lucide-react';
import { faviconPng, makeIco } from '@/lib/favicon';
import { readImage } from '@/lib/image-processing';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

type Icons = { ico: Blob; zip: Blob; preview: Blob; previewSize: number };
const options = [16, 32, 48, 64, 128, 256];

export function FaviconGeneratorTool() {
  const picker = useRef<HTMLInputElement>(null);
  const locked = useRef(false);
  const mounted = useRef(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [source, setSource] = useState<File>();
  const [sizes, setSizes] = useState([16, 32, 48]);
  const [transparent, setTransparent] = useState(true);
  const [background, setBackground] = useState('#ffffff');
  const [error, setError] = useState('');
  const [icons, setIcons] = useState<Icons>();
  const ico = useBlobUrl(icons?.ico);
  const zip = useBlobUrl(icons?.zip);
  const preview = useBlobUrl(icons?.preview);

  useEffect(() => {
    mounted.current = true;
    setReady(true);
    return () => { mounted.current = false; };
  }, []);

  async function generate(files: File[]) {
    if (!ready || locked.current || !files.length || !sizes.length) return;
    if (files.length !== 1) { setError('Choose one image at a time.'); return; }
    const file = files[0];
    locked.current = true;
    setIcons(undefined);
    setError('');
    setBusy(true);
    try {
      const { image } = await readImage(file);
      try {
        const frames = [];
        for (const size of options.filter(size => sizes.includes(size))) frames.push({ size, png: await faviconPng(image, size, transparent ? undefined : background) });
        const icon = await makeIco(frames);
        const { default: JSZip } = await import('jszip');
        const archive = new JSZip();
        archive.file('favicon.ico', await icon.arrayBuffer());
        for (const { size, png } of frames) {
          archive.file(`favicon-${size}x${size}.png`, await png.arrayBuffer());
        }
        archive.file('apple-touch-icon.png', await (await faviconPng(image, 180, transparent ? undefined : background)).arrayBuffer());
        const bundle = await archive.generateAsync({ type: 'blob', mimeType: 'application/zip' });
        const sample = frames.find(frame => frame.size === 32) ?? frames[0];
        if (mounted.current) {
          setName(file.name);
          setSource(file);
          setIcons({ ico: icon, zip: bundle, preview: sample.png, previewSize: sample.size });
        }
      } finally { image.close(); }
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not generate icons.');
    } finally {
      locked.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="Favicon generator workspace" aria-busy={busy}>
      <div className="panel-heading"><h2>Your image</h2></div>
      <div className={`drop-zone ${name ? 'is-compact' : ''}`} onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); void generate(Array.from(event.dataTransfer.files)); }}>
        <input ref={picker} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose favicon image"
          className="sr-only" tabIndex={-1} disabled={!ready || busy || !sizes.length}
          onChange={event => { void generate(Array.from(event.target.files ?? [])); event.target.value = ''; }} />
        <h3 className="break-all">{name || 'Choose a logo or image'}</h3>
        <p>One JPG, PNG, or WebP up to 50 MB</p>
        <button type="button" className="upload-button" disabled={!ready || busy || !sizes.length} onClick={() => picker.current?.click()}>
          <Upload aria-hidden="true" />{name ? 'Choose another image' : 'Select image'}
        </button>
      </div>
      {source && <fieldset disabled={busy} className="mt-4 grid gap-3">
        <legend className="font-medium">Icon settings</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {options.map(size => <label key={size} className="flex min-h-10 items-center gap-2 text-sm">
            <input type="checkbox" checked={sizes.includes(size)} onChange={event => {
              setIcons(undefined);
              setSizes(event.target.checked ? [...sizes, size] : sizes.filter(value => value !== size));
            }} />{size} × {size}
          </label>)}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={transparent} onChange={event => { setTransparent(event.target.checked); setIcons(undefined); }} /> Transparent background</label>
          {!transparent && <label className="flex items-center gap-2 text-sm">Background color<input type="color" value={background} onChange={event => { setBackground(event.target.value); setIcons(undefined); }} /></label>}
        </div>
        {!sizes.length && <p className="text-sm" role="status">Select at least one icon size.</p>}
        {!icons && <button type="button" className="primary" disabled={!sizes.length || busy} onClick={() => void generate([source])}>Generate icons</button>}
      </fieldset>}
      {busy && <p className="mt-4 text-sm" role="status">Generating icons…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {ico && zip && preview && icons && <>
        <div className="mt-4 grid gap-3">
          <h3 className="text-lg font-medium">Your favicon is ready</h3>
          <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-100 p-3">
            <img width={32} height={32} src={preview} alt={`${icons.previewSize} × ${icons.previewSize} favicon preview`} />
            <span className="text-sm">Browser tab preview</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <DownloadButton href={ico} download="favicon.ico" label="Download ICO" />
            <DownloadButton href={zip} download="zipora-favicons.zip" label="Download icon pack" />
          </div>
        </div>
        <AdSlot position="download" />
      </>}
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Icon sizes</h2><ImageIcon size={18} aria-hidden="true" /></div>
        <p>Choose ICO and PNG sizes from 16 to 256 pixels. The ZIP includes a 180 × 180 Apple touch icon.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

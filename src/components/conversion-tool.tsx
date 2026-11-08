'use client';
import { countLabel,pluralize } from '@/lib/counts';
import { ToolIntro, ToolSections } from './tool-sections';

import { useAnimatedList } from '@/hooks/use-animated-list';
import { DownloadButton } from './buttons/download-button';


import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowRight, ArrowUp, CheckCircle2, Download, FilePlus2, FileText, Image as ImageIcon, LockKeyhole, Plus, Trash2, X } from 'lucide-react';
import { SiteHeader, SiteFooter, AdSlot } from './site-chrome';
import { conversionConfig, type ToolKind } from '@/lib/conversion-config';
import { formatBytes, inspectPdf, MAX_TOTAL_BYTES, outputFilename } from '@/lib/pdf';
import { compressAsImages, imagesToPdf, inspectImage, MAX_EXPORT_PAGES, optimizePdf, pdfToJpg, zipImages, type ImagePageSize } from '@/lib/conversions';
import { tools } from '@/lib/tool-catalog';

type Entry = { id: string; file: File; pages: number; width?: number; height?: number; preview?: string };
type Output = { url: string; name: string; size: number; width?: number; height?: number };
type Result = { outputs: Output[]; pages: number; zip?: string; originalSize?: number; savedPercent?: number; strategy?: string; dpi?: number };

export default function ConversionTool({ kind }: { kind: ToolKind }) {
  const config = conversionConfig[kind];
  const slug = kind === 'images' ? 'jpg-to-pdf' : kind === 'extract' ? 'pdf-to-jpg' : 'compress-pdf';
  const isImages = kind === 'images';
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<'reading' | 'processing' | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [filename, setFilename] = useState<string>(config.output);
  const [method, setMethod] = useState('balanced');
  const [pageSize, setPageSize] = useState<ImagePageSize>('a4');
  const [margin, setMargin] = useState(24);
  const [scale, setScale] = useState(2);
  const [quality, setQuality] = useState(.92);
  const [showAllPages, setShowAllPages] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const sequence = useRef(0);
  const locked = useRef(false);
  const mounted = useRef(true);
  const urls = useRef(new Set<string>());
  const previews = useRef(new Set<string>());
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const listRef = useAnimatedList(entries.map(entry => entry.id));
  const totalSize = entries.reduce((sum, item) => sum + item.file.size, 0);
  const totalPages = entries.reduce((sum, item) => sum + item.pages, 0);

  useEffect(() => { mounted.current = true; setReady(true); return () => { mounted.current = false; for (const url of [...urls.current, ...previews.current]) URL.revokeObjectURL(url); urls.current.clear(); previews.current.clear(); }; }, []);
  useEffect(() => { if (result) resultHeading.current?.focus(); }, [result]);
  function clearResult() { setShowAllPages(false); for (const url of urls.current) URL.revokeObjectURL(url); urls.current.clear(); setResult(null); setProgress(0); }
  function resultUrl(blob: Blob) { const url = URL.createObjectURL(blob); urls.current.add(url); return url; }
  function releasePreview(entry: Entry) { if (entry.preview) { URL.revokeObjectURL(entry.preview); previews.current.delete(entry.preview); } }

  async function addFiles(files: File[]) {
    if (locked.current || !files.length) return;
    clearResult(); setError(''); locked.current = true; setBusy('reading');
    const accepted: Entry[] = [];
    const errors: string[] = [];
    let size = isImages ? totalSize : 0;
    try {
      if (!isImages && files.length > 1) { setError('Choose one PDF at a time.'); return; }
      for (const file of files) {
        if (size + file.size > MAX_TOTAL_BYTES) { errors.push(`“${file.name}” exceeds the 200 MB input budget.`); continue; }
        try {
          if (isImages) {
            if (!/\.(jpe?g|png)$/i.test(file.name)) throw new Error(`“${file.name}” is not supported. Choose JPG or PNG images.`);
            const dimensions = await inspectImage(file);
            if (!mounted.current) return;
            const preview = URL.createObjectURL(file); previews.current.add(preview);
            accepted.push({ id: String(++sequence.current), file, pages: 1, ...dimensions, preview });
          } else {
            const pages = await inspectPdf(file);
            if (kind === 'extract' && pages > MAX_EXPORT_PAGES) throw new Error('Choose a PDF with 150 pages or fewer.');
            accepted.push({ id: String(++sequence.current), file, pages });
          }
          size += file.size;
        } catch (cause) { errors.push(cause instanceof Error ? cause.message : 'Could not read this file.'); }
      }
      if (!mounted.current) return;
      if (accepted.length) {
        if (!isImages) entries.forEach(releasePreview);
        setEntries(current => isImages ? [...current, ...accepted] : accepted);
      }
      setError(errors.join(' '));
    } finally { locked.current = false; if (mounted.current) setBusy(null); }
  }
  function remove(id: string) {
    if (locked.current) return;
    clearResult(); entries.filter(item => item.id === id).forEach(releasePreview);
    setEntries(current => current.filter(item => item.id !== id)); setError('');
  }
  function clear() { if (locked.current) return; clearResult(); entries.forEach(releasePreview); setEntries([]); setError(''); }
  function move(index: number, direction: number) {
    if (locked.current) return;
    const next = index + direction;
    if (next < 0 || next >= entries.length) return;
    clearResult(); setEntries(current => { const updated = [...current]; [updated[index], updated[next]] = [updated[next], updated[index]]; return updated; });
  }
  async function runConversion() {
    if (locked.current || !entries.length) return;
    locked.current = true; setBusy('processing'); clearResult(); setError('');
    try {
      if (kind === 'extract') {
        const images = await pdfToJpg(entries[0].file, { scale, quality }, value => { if (mounted.current) setProgress(Math.round(value * .85)); });
        if (!mounted.current) return;
        const zip = images.length > 1 ? await zipImages(images) : null;
        if (!mounted.current) return;
        setResult({ outputs: images.map(image => ({ url: resultUrl(image.blob), name: image.name, size: image.blob.size, width: image.width, height: image.height })), zip: zip ? resultUrl(zip) : undefined, pages: images.length });
      } else {
        const update = (value: number) => { if (mounted.current) setProgress(value); };
        const generated: { bytes: Uint8Array; pages: number; savedPercent?: number; originalSize?: number; strategy?: string; dpi?: number } = kind === 'images' ? await imagesToPdf(entries.map(item => item.file), { pageSize, margin }, update) : method === 'strong' ? await compressAsImages(entries[0].file, .45, update) : await optimizePdf(entries[0].file, update);
        if (!mounted.current) return;
        const blob = new Blob([new Uint8Array(generated.bytes)], { type: 'application/pdf' });
        setResult({ outputs: [{ url: resultUrl(blob), name: 'result.pdf', size: blob.size }], pages: generated.pages, savedPercent: generated.savedPercent, originalSize: generated.originalSize, strategy: generated.strategy, dpi: generated.dpi });
      }
      setProgress(100);
    } catch (cause) { if (mounted.current) { clearResult(); setError(cause instanceof Error ? cause.message : 'Processing failed. Try a smaller file in a current browser.'); } }
    finally { locked.current = false; if (mounted.current) setBusy(null); }
  }
  const status = busy === 'reading' ? 'Checking your files…' : busy === 'processing' ? `Processing on your device… ${progress}%` : !entries.length ? isImages ? 'Choose at least one JPG or PNG to get started.' : 'Choose one PDF to get started.' : `${countLabel(entries.length, isImages ? 'image' : 'PDF')} ready`;

  return <>
    <a className="skip-link" href="#main">Skip to tool</a><SiteHeader active={config.title} />
    <main id="main" className="main-shell">
      <ToolIntro slug={slug} />
      <div className="workspace"><section className="tool-panel" aria-label={config.title + ' workspace'} aria-busy={Boolean(busy)}>
        <div className="panel-heading"><h2>{isImages ? 'Your images' : 'Your PDF'}</h2><span>01 / Choose & prepare</span></div>
        <div className={`drop-zone ${dragging ? 'is-dragging' : ''} ${entries.length ? 'is-compact' : ''}`} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); void addFiles(Array.from(event.dataTransfer.files)); }}>
          <input className="sr-only" ref={input} type="file" aria-label={isImages ? 'Choose images' : 'Choose PDF'} accept={config.accept} multiple={isImages} disabled={!ready || Boolean(busy)} onChange={event => { void addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
          <div className="upload-art" aria-hidden="true"><div className="paper-sheet sheet-back" /><div className="paper-sheet sheet-front"><span>{isImages ? 'JPG' : 'PDF'}</span><i /><i /><i /></div><span className="paper-plus"><Plus /></span></div>
          <h3>{entries.length ? isImages ? 'Add another image' : 'Choose a different PDF' : config.upload}</h3><p>{isImages ? 'JPG and PNG, in the order you choose' : 'One document, processed privately'}</p>
          <button className="upload-button" disabled={!ready || Boolean(busy)} onClick={() => input.current?.click()}><FilePlus2 />{busy === 'reading' ? 'Reading files…' : entries.length ? isImages ? 'Add images' : 'Replace PDF' : config.button}</button><span className="upload-hint">{isImages ? 'JPG / PNG' : 'Unlocked PDFs'} · 200 MB input maximum</span>
        </div>
        {error && <div className="error-message" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X /></button></div>}
        {entries.length > 0 && <section className="file-section" aria-label="Selected files"><div className="file-toolbar"><h3>{isImages ? 'Page order' : 'Selected document'} <span>{countLabel(entries.length, isImages ? 'image' : 'file')}</span></h3><button disabled={Boolean(busy)} onClick={clear}>Clear all</button></div>{isImages && <p className="order-hint">One image per page. Use the arrows to choose the order.</p>}<ol ref={listRef} className="file-list">{entries.map((entry, index) => <li className="file-row" data-file-id={entry.id} key={entry.id}><span className="file-number">{String(index + 1).padStart(2, '0')}</span>{entry.preview ? <img className="file-thumbnail" src={entry.preview} alt="" /> : <span className="file-icon"><FileText /></span>}<div className="file-info"><strong title={entry.file.name}>{entry.file.name}</strong><span>{isImages ? `${entry.width} × ${entry.height} px` : countLabel(entry.pages, 'page')} · {formatBytes(entry.file.size)}</span></div><div className="file-actions">{isImages && <><button disabled={Boolean(busy) || index === 0} aria-label={`Move ${entry.file.name} up`} onClick={() => move(index, -1)}><ArrowUp /></button><button disabled={Boolean(busy) || index === entries.length - 1} aria-label={`Move ${entry.file.name} down`} onClick={() => move(index, 1)}><ArrowDown /></button></>}<button disabled={Boolean(busy)} className="remove-button" aria-label={`Remove ${entry.file.name}`} onClick={() => remove(entry.id)}><Trash2 /></button></div></li>)}</ol></section>}
        <fieldset className="tool-options" disabled={Boolean(busy)}><legend>Output options</legend>
          {kind === 'compress' && <><label>Compression method<select value={method} onChange={event => { clearResult(); setMethod(event.target.value); }}><option value="optimize">Optimize structure · keep text</option><option value="balanced">Balanced · keep selectable text</option><option value="strong">Strong · image-based PDF</option></select></label><p className={method !== 'strong' ? 'option-help' : 'option-warning'}>{method !== 'strong' ? 'Keeps selectable text and compares rewritten versions. Already optimized files may stay the same size. Bookmarks, forms, metadata, and signatures may change.' : 'Text will become an image, not selectable, and quality will drop. Links, forms, attachments, and signatures will be lost. Strong uses at least 150 DPI and keeps the smallest result.'}</p></>}
          {kind === 'images' && <><label>Page size<select value={pageSize} onChange={event => { clearResult(); setPageSize(event.target.value as ImagePageSize); }}><option value="a4">A4 · portrait</option><option value="letter">US Letter · portrait</option><option value="original">Original image size</option></select></label><label>Margins<select value={margin} disabled={pageSize === 'original'} onChange={event => { clearResult(); setMargin(Number(event.target.value)); }}><option value={0}>None</option><option value={24}>Small · 24 pt</option><option value={48}>Wide · 48 pt</option></select></label><p className="option-help">Images fit without cropping or stretching. In original-size mode, one image pixel equals one PDF point and margins are off. Photo rotation tags are not applied; rotate the source image first if needed.</p></>}
          {kind === 'extract' && <><label>Resolution<select value={scale} onChange={event => { clearResult(); setScale(Number(event.target.value)); }}><option value={1}>Standard · 72 DPI</option><option value={2}>High · 144 DPI</option><option value={3}>Print · 216 DPI</option></select></label><label>JPEG quality<select value={quality} onChange={event => { clearResult(); setQuality(Number(event.target.value)); }}><option value={.7}>Smaller files · 70%</option><option value={.92}>High quality · 92%</option><option value={1}>Maximum · 100%</option></select></label><p className="option-help">Each page is capped at 16 megapixels to protect device memory. White backgrounds are used for JPG output.</p></>}
        </fieldset>
        <div className="merge-controls"><div className="output-field"><label htmlFor="output-name">{kind === 'extract' ? totalPages === 1 ? 'Save your JPG as' : 'ZIP filename' : 'Save your PDF as'}</label><div><input id="output-name" aria-label="Output filename" value={filename} maxLength={120} onChange={event => setFilename(event.target.value)} /><span>{kind === 'extract' ? totalPages === 1 ? '.jpg' : '.zip' : '.pdf'}</span></div></div><button className="primary merge-button" disabled={Boolean(busy) || !entries.length} onClick={() => void runConversion()}>{busy === 'processing' ? `${progress}%` : config.action}<ArrowRight /></button></div>
        <div className="status-line" role="status" aria-live="polite">{status}</div>{busy === 'processing' && <progress max={100} value={progress} aria-label="Processing progress" />}
        {result && <section className="conversion-result" aria-label="Conversion result"><div className="result"><CheckCircle2 /><div><h2 tabIndex={-1} ref={resultHeading}>{kind === 'extract' ? 'Your JPGs are ready' : kind === 'compress' && !result.savedPercent ? 'No smaller PDF found' : 'Your PDF is ready'}</h2><p>{countLabel(result.pages, kind === 'extract' ? 'JPG image' : 'page')} · {formatBytes(result.outputs.reduce((sum, output) => sum + output.size, 0))}</p>
          {result.originalSize !== undefined && <><dl className="size-comparison"><div><dt>Original</dt><dd>{formatBytes(result.originalSize)}</dd></div><div><dt>New size</dt><dd>{formatBytes(result.outputs[0].size)}</dd></div><div><dt>{(result.savedPercent || 0) < 0 ? 'Larger by' : 'Saved'}</dt><dd>{Math.abs(result.savedPercent || 0).toFixed(1)}%</dd></div></dl>{result.strategy === 'image' && <p className="option-warning">Image-based output · {result.dpi} DPI. Text is not selectable.</p>}{(result.savedPercent || 0) <= 0 ? <p className="option-help">This PDF could not be made smaller with the available methods. Your original bytes are kept unchanged.</p> : result.strategy && result.strategy !== 'image' && method === 'strong' ? <p className="option-help">A text-preserving version was smaller than the image-based version, so we kept it instead.</p> : null}</>}
          {kind === 'extract' ? <DownloadButton href={result.outputs.length === 1 ? result.outputs[0].url : result.zip} download={outputFilename(filename.replace(/\.(zip|jpe?g)$/i, '')).replace(/\.pdf$/i, result.outputs.length === 1 ? '.jpg' : '.zip')} label={result.outputs.length === 1 ? 'Download JPG' : 'Download all JPGs'} /> : <DownloadButton href={result.outputs[0].url} download={outputFilename(filename)} label={kind === 'compress' && !result.savedPercent ? 'Download original PDF' : 'Download PDF'} />}
        </div></div>{kind === 'extract' && <div className="jpg-preview-section"><div id="jpg-page-previews" className="jpg-results">{result.outputs.slice(0, showAllPages ? result.outputs.length : 6).map((output, index) => <article className="jpg-result" key={output.name}><img src={output.url} alt={`Rendered PDF page ${index + 1}`} loading="lazy" /><div><strong>Page {index + 1}</strong><span>{output.width} × {output.height} px · {formatBytes(output.size)}</span>{result.outputs.length > 1 && <DownloadButton className="download-button--compact" href={output.url} download={output.name} label="Download JPG" aria-label={`Download page ${index + 1}`} />}</div></article>)}</div>{result.outputs.length > 6 && <button type="button" className="show-page-previews" aria-expanded={showAllPages} aria-controls="jpg-page-previews" onClick={() => setShowAllPages(value => !value)}>{showAllPages ? 'Show first 6 pages' : `Show all ${result.outputs.length} pages`}</button>}</div>}</section>}
        {result && <AdSlot position="download"/>}
        <div className="panel-privacy"><LockKeyhole />Files stay on your device, from start to finish</div>
      </section><div className="tool-sidebar"><aside className="side-panel conversion-aside"><div className="panel-heading"><h2>The finished format</h2><span>{kind === 'extract' ? 'JPG' : 'PDF'}</span></div><div className="document-preview" aria-hidden="true"><div className="preview-binding" /><div className="preview-page"><span>Zipora</span>{kind === 'extract' ? <ImageIcon /> : <FileText />}<strong>{totalPages || '—'}</strong><small>{kind === 'extract' ? `${pluralize(totalPages,'page')} to ${pluralize(totalPages,'image')}` : `${pluralize(totalPages,'page')}, together`}</small><i /><i /><i /></div></div><dl className="document-stats"><div><dt>Input</dt><dd>{entries.length || '—'} {pluralize(entries.length, isImages ? 'image' : 'PDF')}</dd></div><div><dt>Pages</dt><dd>{totalPages || '—'}</dd></div><div><dt>Input size</dt><dd>{totalSize ? formatBytes(totalSize) : '—'}</dd></div></dl><div className="privacy-note"><LockKeyhole /><div><h3>A private workspace</h3><p>No uploads, accounts, or added watermarks. Your browser does the work.</p></div></div></aside><AdSlot position="sidebar"/></div></div>
      <ToolSections slug={slug} />
    </main><SiteFooter />
  </>;
}

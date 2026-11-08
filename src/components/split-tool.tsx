'use client';
import { countLabel,pluralize } from '@/lib/counts';
import { ToolIntro, ToolSections } from './tool-sections';

import { DownloadButton } from './buttons/download-button';


import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Download, FilePlus2, FileText, LockKeyhole, Plus, Trash2, X } from 'lucide-react';
import { SiteHeader, SiteFooter, AdSlot } from './site-chrome';
import { formatBytes, inspectPdf, MAX_TOTAL_BYTES, outputFilename } from '@/lib/pdf';
import { parsePageSelection, planSplit, splitPdf, zipSplitParts, type SplitOptions } from '@/lib/split-pdf';

type SelectedFile = { file: File; pages: number };
type Result = { outputs: { url: string; name: string; size: number; pages: number[] }[]; zip?: string; totalSize: number };
const faqs = [
  ['Can I split a PDF into separate pages?', 'Yes. Choose Extract pages, leave All pages selected, and turn off Combine into one PDF. Every page becomes its own PDF. Download them individually or together in a ZIP.'],
  ['How do custom ranges work?', 'Separate ranges with commas, for example 1-3, 5, 7-9. Each range becomes one PDF unless you combine them. Ranges follow the order entered; overlapping custom ranges intentionally repeat pages. Selected-page extraction includes repeated pages only once.'],
  ['What if a page exceeds my size limit?', 'Size mode checks the actual output bytes. If one page alone is too large, increase your limit or compress the original PDF first. Splitting does not downsample or compress page content.'],
  ['Are my files private?', 'Yes. Zipora copies pages locally in your browser. Your original stays unchanged. Use unlocked PDFs up to 200 MB and 10,000 pages. A batch can create up to 200 files and 200 MB of output. Device memory may require smaller batches. Page content is copied, but bookmarks, attachments, forms, and signatures are not guaranteed to survive.'],
];

function compactPages(pages: number[]) {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const ranges: string[] = [];
  for (let index = 0; index < sorted.length; index++) {
    const start = sorted[index];
    while (index + 1 < sorted.length && sorted[index + 1] === sorted[index] + 1) index++;
    ranges.push(start === sorted[index] ? String(start) : `${start}-${sorted[index]}`);
  }
  return ranges.join(', ');
}

export default function SplitTool() {
  const [ready, setReady] = useState(false);
  const [source, setSource] = useState<SelectedFile | null>(null);
  const [mode, setMode] = useState<'ranges' | 'pages' | 'size'>('ranges');
  const [rangeMode, setRangeMode] = useState<'custom' | 'fixed'>('custom');
  const [ranges, setRanges] = useState('1');
  const [every, setEvery] = useState('1');
  const [selection, setSelection] = useState<'all' | 'selected'>('all');
  const [pages, setPages] = useState('1');
  const [combine, setCombine] = useState(false);
  const [maxSize, setMaxSize] = useState('1');
  const [unit, setUnit] = useState('MB');
  const [filename, setFilename] = useState('zipora-split');
  const [busy, setBusy] = useState<'reading' | 'splitting' | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pickerStart, setPickerStart] = useState(1);
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  const urls = useRef(new Set<string>());
  const resultHeading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { mounted.current = true; setReady(true); return () => { mounted.current = false; controller.current?.abort(); urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); }; }, []);
  useEffect(() => { if (result) resultHeading.current?.focus(); }, [result]);

  const options: SplitOptions = useMemo(() => mode === 'ranges' ? { mode, rangeMode, ranges, every: Number(every), combine } : mode === 'pages' ? { mode, selection, pages, combine } : { mode, maxBytes: Number(maxSize) * (unit === 'KB' ? 1024 : 1024 * 1024) }, [mode, rangeMode, ranges, every, selection, pages, combine, maxSize, unit]);
  const preview = useMemo(() => {
    if (!source) return { groups: [] as number[][], error: '' };
    try {
      if (options.mode === 'size') {
        if (!Number.isFinite(options.maxBytes) || options.maxBytes < 1024 || options.maxBytes > MAX_TOTAL_BYTES) throw new Error('Choose a size between 1 KB and 200 MB.');
        return { groups: [] as number[][], error: '' };
      }
      return { groups: planSplit(source.pages, options), error: '' };
    } catch (cause) { return { groups: [] as number[][], error: cause instanceof Error ? cause.message : 'Check the page selection.' }; }
  }, [source, options]);
  const selectedPages = useMemo(() => { if (!source) return new Set<number>(); try { return new Set(selection === 'all' ? Array.from({ length: source.pages }, (_, index) => index + 1) : parsePageSelection(pages, source.pages)); } catch { return new Set<number>(); } }, [source, selection, pages]);

  function resetResult() { urls.current.forEach(url => URL.revokeObjectURL(url)); urls.current.clear(); setResult(null); setProgress(0); setError(''); }
  function makeUrl(blob: Blob) { const url = URL.createObjectURL(blob); urls.current.add(url); return url; }
  function changeSetting(action: () => void) { if (lock.current) return; resetResult(); action(); }
  async function chooseFiles(files: File[]) {
    if (!files.length || lock.current) return;
    resetResult(); lock.current = true; setBusy('reading');
    try {
      if (files.length !== 1) throw new Error('Choose one PDF to split at a time.');
      const file = files[0];
      if (file.size > MAX_TOTAL_BYTES) throw new Error('Choose a PDF under 200 MB.');
      const count = await inspectPdf(file);
      if (count > 10_000) throw new Error('Choose a PDF with 10,000 pages or fewer.');
      if (!mounted.current) return;
      setSource({ file, pages: count }); setRanges(count === 1 ? '1' : `1-${count}`); setPages('1'); setEvery('1'); setPickerStart(1);
    } catch (cause) { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not read this PDF.'); }
    finally { lock.current = false; if (mounted.current) setBusy(null); }
  }
  function clearFile() { if (lock.current) return; resetResult(); setSource(null); }
  function togglePage(page: number) {
    changeSetting(() => { const next = new Set(selectedPages); next.has(page) ? next.delete(page) : next.add(page); setSelection('selected'); setPages(compactPages([...next])); });
  }
  async function runSplit() {
    if (lock.current || !source || preview.error) return;
    resetResult(); lock.current = true; setBusy('splitting');
    const operation = new AbortController(); controller.current = operation;
    try {
      const parts = await splitPdf(source.file, options, value => { if (mounted.current) setProgress(Math.round(value * .9)); }, operation.signal);
      operation.signal.throwIfAborted();
      const names = parts.map((_, index) => outputFilename(`${filename || 'zipora-split'}-part-${String(index + 1).padStart(3, '0')}`));
      const zipped = parts.length > 1 ? await zipSplitParts(parts, names) : null;
      operation.signal.throwIfAborted();
      if (!mounted.current) return;
      const outputs = parts.map((part, index) => ({ url: makeUrl(new Blob([new Uint8Array(part.bytes)], { type: 'application/pdf' })), name: names[index], size: part.bytes.length, pages: part.pages }));
      setResult({ outputs, zip: zipped ? makeUrl(zipped) : undefined, totalSize: outputs.reduce((sum, part) => sum + part.size, 0) }); setProgress(100);
    } catch (cause) {
      if (mounted.current) { resetResult(); setError(operation.signal.aborted ? 'Splitting cancelled. Your original PDF is unchanged.' : cause instanceof Error ? cause.message : 'Could not split this PDF. Try fewer pages.'); }
    } finally { if (controller.current === operation) controller.current = null; lock.current = false; if (mounted.current) setBusy(null); }
  }

  return <>
    <a className="skip-link" href="#main">Skip to tool</a><SiteHeader active="Split PDF" />
    <main id="main" className="main-shell">
      <ToolIntro slug="split-pdf" />
      <div className="workspace"><section className="tool-panel" aria-label="Split PDF workspace" aria-busy={Boolean(busy)}>
        <div className="panel-heading"><h2>Your PDF</h2><span>01 / Choose & separate</span></div>
        <div className={`drop-zone ${source ? 'is-compact' : ''} ${dragging ? 'is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }} onDrop={event => { event.preventDefault(); setDragging(false); void chooseFiles(Array.from(event.dataTransfer.files)); }}>
          <input ref={input} className="sr-only" aria-label="Choose PDF to split" type="file" accept=".pdf,application/pdf" disabled={!ready || Boolean(busy)} onChange={event => { void chooseFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
          <div className="upload-art" aria-hidden="true"><div className="paper-sheet sheet-back" /><div className="paper-sheet sheet-front"><span>PDF</span><i /><i /><i /></div><span className="paper-plus"><Plus /></span></div><h3>{source ? 'Choose another document' : 'Drop a PDF here'}</h3><p>Keep what matters. Leave the rest.</p><button className="upload-button" disabled={!ready || Boolean(busy)} onClick={() => input.current?.click()}><FilePlus2 />{busy === 'reading' ? 'Reading PDF…' : source ? 'Replace PDF' : 'Select PDF'}</button><span className="upload-hint">One unlocked PDF · Up to 200 MB</span>
        </div>
        {error && <div className="error-message" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X /></button></div>}
        {source && <div className="file-row split-source"><span className="file-icon"><FileText /></span><div className="file-info"><strong title={source.file.name}>{source.file.name}</strong><span>{countLabel(source.pages,'page')} · {formatBytes(source.file.size)}</span></div><div className="file-actions"><button className="remove-button" aria-label="Remove PDF" disabled={Boolean(busy)} onClick={clearFile}><Trash2 /></button></div></div>}
        <div className="split-tabs" role="tablist" aria-label="Split method">{([['ranges', 'Ranges'], ['pages', 'Extract pages'], ['size', 'By size']] as const).map(([value, label]) => <button role="tab" id={`tab-${value}`} key={value} aria-selected={mode === value} aria-controls="split-settings" disabled={Boolean(busy)} onClick={() => changeSetting(() => { setMode(value); setCombine(false); })}>{label}</button>)}</div>
        <section key={mode} id="split-settings" role="tabpanel" aria-labelledby={`tab-${mode}`}>
          <fieldset className="tool-options" disabled={Boolean(busy)}><legend>{mode === 'ranges' ? 'Choose your ranges' : mode === 'pages' ? 'Choose your pages' : 'Set the maximum file size'}</legend>
            {mode === 'ranges' && <><label>Range mode<select aria-label="Range mode" value={rangeMode} onChange={event => changeSetting(() => setRangeMode(event.target.value as 'custom' | 'fixed'))}><option value="custom">Custom ranges</option><option value="fixed">Fixed pages per file</option></select></label>{rangeMode === 'custom' ? <label>Page ranges<input className="split-input" aria-label="Page ranges" value={ranges} placeholder="1-3, 5, 7-9" maxLength={4000} onChange={event => changeSetting(() => setRanges(event.target.value))} /></label> : <label>Pages per file<input className="split-input" aria-label="Pages per file" type="number" min={1} max={source?.pages || 10000} value={every} onChange={event => changeSetting(() => setEvery(event.target.value))} /></label>}<p className="option-help">{rangeMode === 'custom' ? 'Each comma-separated range creates one PDF, in the order entered. Overlapping ranges repeat pages.' : 'Split into equal page groups. The last file includes any remaining pages.'}</p></>}
            {mode === 'pages' && <><label>Extract mode<select aria-label="Extract mode" value={selection} onChange={event => changeSetting(() => setSelection(event.target.value as 'all' | 'selected'))}><option value="all">All pages</option><option value="selected">Selected pages</option></select></label><label>Pages to extract<input aria-label="Pages to extract" className="split-input" value={pages} placeholder="1, 5-8" maxLength={4000} disabled={selection === 'all'} onChange={event => changeSetting(() => setPages(event.target.value))} /></label><p className="option-help">Type pages in your preferred order, or use the numbered selector below. Repeated pages are included once.</p></>}
            {mode === 'size' && <><label>Maximum size<input aria-label="Maximum size" className="split-input" type="number" min={unit === 'KB' ? 1 : .001} step="any" value={maxSize} onChange={event => changeSetting(() => setMaxSize(event.target.value))} /></label><label>Size unit<select aria-label="Size unit" value={unit} onChange={event => changeSetting(() => setUnit(event.target.value))}><option>MB</option><option>KB</option></select></label><p className="option-help">Pages stay in document order. Every output is checked against this limit. Pages are not compressed; if one page is too large, increase the limit or <Link href="/compress-pdf/">compress the PDF first</Link>.</p></>}
            {((mode === 'ranges' && rangeMode === 'custom') || mode === 'pages') && <label className="split-checkbox"><input aria-label="Combine into one PDF" type="checkbox" checked={combine} onChange={event => changeSetting(() => setCombine(event.target.checked))} /><span>Combine {mode === 'ranges' ? 'all ranges' : 'selected pages'} into one PDF</span></label>}
          </fieldset>
          {source && mode === 'pages' && <section className="page-picker" aria-label="Page selector"><div className="picker-heading"><span>Pages {pickerStart}–{Math.min(pickerStart + 47, source.pages)} of {source.pages}</span><span>{selectedPages.size} selected</span></div><div className="page-picker-grid">{Array.from({ length: Math.min(48, source.pages - pickerStart + 1) }, (_, index) => pickerStart + index).map(page => <button key={page} disabled={Boolean(busy)} aria-label={`Toggle page ${page}`} aria-pressed={selectedPages.has(page)} onClick={() => togglePage(page)}><FileText /><span>{page}</span></button>)}</div><div className="picker-pagination"><button disabled={Boolean(busy) || pickerStart === 1} onClick={() => setPickerStart(start => Math.max(1, start - 48))}>Previous pages</button><button disabled={Boolean(busy) || pickerStart + 48 > source.pages} onClick={() => setPickerStart(start => start + 48)}>Next pages</button></div><p className="option-help">Numbered page selector, not a content preview. Clicking pages uses their original document order.</p></section>}
          {source && <p className={preview.error ? 'selection-error' : 'split-plan'} role="status">{preview.error || (mode === 'size' ? 'File count is calculated from the actual output sizes.' : `${preview.groups.length} PDF ${preview.groups.length === 1 ? 'file' : 'files'} will be created · ${countLabel(preview.groups.flat().length,'output page')}`)}</p>}
        </section>
        <div className="merge-controls"><div className="output-field"><label htmlFor="split-name">Filename prefix</label><div><input id="split-name" maxLength={80} value={filename} disabled={Boolean(busy)} onChange={event => changeSetting(() => setFilename(event.target.value))} /><span>.pdf</span></div></div><button className="primary merge-button" disabled={!ready || Boolean(busy) || !source || Boolean(preview.error)} onClick={() => void runSplit()}>{busy === 'splitting' ? `Splitting… ${progress}%` : 'Split PDF'}<ArrowRight /></button></div>
        {busy === 'splitting' && <><progress aria-label="Split progress" value={progress} max={100} /><button className="cancel-split" onClick={() => controller.current?.abort()}>Cancel splitting</button></>}
        <p className="status-line" role="status" aria-live="polite">{busy === 'reading' ? 'Checking your PDF…' : busy === 'splitting' ? 'Copying your pages on this device…' : source ? '' : 'Choose a PDF to get started.'}</p>
        {result && <section aria-label="Split results"><div className="result"><CheckCircle2 /><div><h2 tabIndex={-1} ref={resultHeading}>Your PDFs are ready</h2><p>{result.outputs.length} {result.outputs.length === 1 ? 'PDF' : 'PDFs'} · {formatBytes(result.totalSize)}</p>{result.zip && <DownloadButton href={result.zip} download={outputFilename(filename).replace(/\.pdf$/i, '.zip')} label="Download all PDFs" />}</div></div><ol className="split-downloads">{result.outputs.map((output, index) => <li key={output.name}><FileText /><div><strong>{output.name}</strong><span>{countLabel(output.pages.length,'page')} · {formatBytes(output.size)}</span></div><DownloadButton className="download-button--compact" href={output.url} download={output.name} label="PDF" aria-label={`Download part ${index + 1}`} downloadingLabel="Starting…" doneLabel="Started" /></li>)}</ol></section>}
        {result && <AdSlot position="download"/>}
        <div className="panel-privacy"><LockKeyhole />Your original PDF stays unchanged. No uploads.</div>
      </section><div className="tool-sidebar"><aside className="side-panel conversion-aside"><div className="panel-heading"><h2>The document plan</h2><span>PDF → PDFs</span></div><div className="document-preview" aria-hidden="true"><div className="preview-binding" /><div className="preview-page"><span>Zipora</span><FileText /><strong>{source?.pages || '—'}</strong><small>{pluralize(source?.pages||0,'page')} to work with</small><i /><i /><i /></div></div><dl className="document-stats"><div><dt>Source pages</dt><dd>{source?.pages || '—'}</dd></div><div><dt>Planned files</dt><dd>{!source || preview.error || mode === 'size' ? '—' : preview.groups.length}</dd></div><div><dt>Original size</dt><dd>{source ? formatBytes(source.file.size) : '—'}</dd></div></dl><div className="privacy-note"><LockKeyhole /><div><h3>Only the pages you need</h3><p>Pages are copied directly, without flattening them into images. Files stay on your device.</p></div></div></aside><AdSlot position="sidebar"/></div></div>
      <ToolSections slug="split-pdf" />
    </main><SiteFooter />
  </>;
}

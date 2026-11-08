'use client';
import { countLabel,pluralize } from '@/lib/counts';
import { ToolIntro, ToolSections } from './tool-sections';

import { useAnimatedList } from '@/hooks/use-animated-list';
import { DownloadButton } from './buttons/download-button';


import { useEffect, useRef, useState } from 'react';
import { SiteHeader, SiteFooter, AdSlot } from './site-chrome';
import { ArrowDown, ArrowUp, ArrowRight, Check, CheckCircle2, Download, FilePlus2, FileText, LockKeyhole, Plus, Trash2, X, Zap } from 'lucide-react';
import { formatBytes, inspectPdf, MAX_TOTAL_BYTES, mergePdfs, outputFilename } from '@/lib/pdf';

type Entry = { id: string; file: File; pages: number };
type Result = { url: string; pages: number; size: number; files: number };
const faqs = [
  ['Is Zipora really free?', 'Yes. Merge and download your PDFs without an account, subscription, or watermark.'],
  ['Do my files leave my device?', 'No. This tool reads and merges PDFs inside your browser. Your documents are not sent to a server or saved by Zipora.'],
  ['Can I change the order of my files?', 'Yes. Use the up and down arrows beside each file. Pages inside each PDF stay in their original order.'],
  ['Which PDFs can I merge?', 'Use valid, unlocked PDFs. Password-protected or damaged files must be repaired or unlocked first. This tool has a 200 MB combined-input safety budget; your device may reach its memory limit sooner. Digital signatures and interactive features may not survive merging.'],
];


export default function MergeTool() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<'reading' | 'merging' | null>(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [filename, setFilename] = useState('zipora-merged');
  const input = useRef<HTMLInputElement>(null);
  const lock = useRef(false);
  const mounted = useRef(false);
  const operationGeneration = useRef(0);
  const entrySequence = useRef(0);
  const urlRef = useRef<string | null>(null);
  const resultFocus = useRef<HTMLHeadingElement>(null);
  const listRef = useAnimatedList(entries.map(entry => entry.id));
  const totalSize = entries.reduce((sum, entry) => sum + entry.file.size, 0);
  const totalPages = entries.reduce((sum, entry) => sum + entry.pages, 0);

  useEffect(() => {
    mounted.current = true;
    setReady(true);
    return () => {
      mounted.current = false;
      operationGeneration.current++;
      lock.current = false;
      releaseResultUrl();
    };
  }, []);
  useEffect(() => { if (result) resultFocus.current?.focus(); }, [result]);

  function releaseResultUrl() {
    const owned = urlRef.current;
    urlRef.current = null;
    if (owned) URL.revokeObjectURL(owned);
  }
  function isCurrentOperation(operation: number) {
    return mounted.current && operationGeneration.current === operation;
  }
  function invalidate() {
    operationGeneration.current++;
    releaseResultUrl();
    setResult(null);
    setProgress(0);
  }
  async function addFiles(files: File[]) {
    if (lock.current || !files.length) return;
    lock.current = true;
    setBusy('reading');
    setError('');
    invalidate();
    const operation = operationGeneration.current;
    let size = totalSize;
    const accepted: Entry[] = [];
    const errors: string[] = [];
    try {
      for (const file of files) {
        if (!isCurrentOperation(operation)) return;
        if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
          errors.push(`“${file.name}” is not a PDF. Please choose PDF files.`);
          continue;
        }
        if (size + file.size > MAX_TOTAL_BYTES) {
          errors.push(`“${file.name}” would exceed the 200 MB combined-file safety budget.`);
          continue;
        }
        try {
          const pages = await inspectPdf(file);
          if (!isCurrentOperation(operation)) return;
          accepted.push({ id: String(++entrySequence.current), file, pages });
          size += file.size;
        } catch (cause) { errors.push(cause instanceof Error ? cause.message : 'Unable to read this PDF.'); }
      }
      if (!isCurrentOperation(operation)) return;
      setEntries(current => [...current, ...accepted]);
      setError(errors.join(' '));
    } finally { if (isCurrentOperation(operation)) { setBusy(null); lock.current = false; } }
  }
  function move(index: number, direction: number) {
    if (lock.current) return;
    const next = index + direction;
    if (next < 0 || next >= entries.length) return;
    invalidate();
    setEntries(current => { const list = [...current]; [list[index], list[next]] = [list[next], list[index]]; return list; });
  }
  function remove(id: string) {
    if (lock.current) return;
    invalidate(); setEntries(current => current.filter(entry => entry.id !== id)); setError('');
  }
  function clear() { if (lock.current) return; invalidate(); setEntries([]); setError(''); }
  async function merge() {
    if (lock.current || entries.length < 2) return;
    lock.current = true;
    setBusy('merging'); setError(''); invalidate();
    const operation = operationGeneration.current;
    try {
      const merged = await mergePdfs(entries.map(entry => entry.file), value => {
        if (isCurrentOperation(operation)) setProgress(value);
      });
      // Guard publication, not computation: pdf-lib may finish after navigation.
      if (!isCurrentOperation(operation)) return;
      const blob = new Blob([new Uint8Array(merged.bytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      if (!isCurrentOperation(operation)) { URL.revokeObjectURL(url); return; }
      urlRef.current = url;
      setResult({ url, pages: merged.pages, size: blob.size, files: entries.length });
    } catch (cause) { if (isCurrentOperation(operation)) setError(cause instanceof Error ? cause.message : 'Could not merge these PDFs. Try smaller files or reload the page.'); }
    finally { if (isCurrentOperation(operation)) { setBusy(null); lock.current = false; } }
  }

  return <>
    <a className="skip-link" href="#main">Skip to tool</a>
    <SiteHeader active="Merge PDF" />
    
    <main id="main" className="main-shell">
      <ToolIntro slug="merge-pdf" />

      <div className="workspace">
        <section className="tool-panel" aria-label="PDF merger" aria-busy={Boolean(busy)}>
          <div className="panel-heading"><h2>Your PDFs</h2><span>01 / Add &amp; arrange</span></div>
          <div className={`drop-zone ${dragging ? 'is-dragging' : ''} ${entries.length ? 'is-compact' : ''}`}
            onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
            onDrop={event => { event.preventDefault(); setDragging(false); void addFiles(Array.from(event.dataTransfer.files)); }}>
            <input ref={input} id="pdf-upload" aria-label="Choose PDF files" className="sr-only" type="file" accept=".pdf,application/pdf" multiple disabled={!ready || Boolean(busy)} onChange={event => { void addFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
            <div className="upload-art" aria-hidden="true"><div className="paper-sheet sheet-back" /><div className="paper-sheet sheet-front"><FileText /><span>PDF</span><i /><i /><i /></div><span className="paper-plus"><Plus /></span></div>
            <h3>{entries.length ? 'Add another document' : 'Drop your PDFs here'}</h3>
            <p>Choose two or more documents to get started</p>
            <button className="upload-button" disabled={!ready || Boolean(busy)} onClick={() => input.current?.click()}><FilePlus2 size={18} /> {busy === 'reading' ? 'Reading PDFs…' : entries.length ? 'Add more files' : 'Select PDF files'}<Plus size={16} /></button>
            <span className="upload-hint">Two or more PDFs · Up to 200 MB combined</span>
          </div>
          {error && <div className="error-message" role="alert"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={17} /></button></div>}
          {entries.length > 0 && <section className="file-section" aria-label="Selected PDFs"><div className="file-toolbar"><h3>File order <span>{countLabel(entries.length,'file')}</span></h3><button disabled={Boolean(busy)} onClick={clear}>Clear all</button></div><p className="order-hint">Use the arrows to rearrange.</p><ol ref={listRef} className="file-list">{entries.map((entry, index) => <li className="file-row" data-file-id={entry.id} key={entry.id}>
            <span className="file-number">{String(index + 1).padStart(2, '0')}</span><span className="file-icon"><FileText size={22} /></span><div className="file-info"><strong title={entry.file.name}>{entry.file.name}</strong><span>{entry.pages} {entry.pages === 1 ? 'page' : 'pages'} <i>·</i> {formatBytes(entry.file.size)}</span></div><div className="file-actions"><button aria-label={`Move ${entry.file.name} up`} disabled={Boolean(busy) || index === 0} onClick={() => move(index, -1)}><ArrowUp size={16} /></button><button aria-label={`Move ${entry.file.name} down`} disabled={Boolean(busy) || index === entries.length - 1} onClick={() => move(index, 1)}><ArrowDown size={16} /></button><button className="remove-button" aria-label={`Remove ${entry.file.name}`} disabled={Boolean(busy)} onClick={() => remove(entry.id)}><Trash2 size={16} /></button></div>
          </li>)}</ol><div className="queue-total"><span>{countLabel(totalPages,'page')} in total</span><span>{formatBytes(totalSize)}</span></div></section>}
          <div className="merge-controls"><div className="output-field"><label htmlFor="output-name">Save your PDF as</label><div><input id="output-name" aria-label="Output filename" maxLength={120} value={filename} onChange={event => setFilename(event.target.value)} /><span>.pdf</span></div></div><button className="primary merge-button" disabled={Boolean(busy) || entries.length < 2} onClick={() => void merge()}>{busy === 'merging' ? `Merging… ${progress}%` : 'Merge PDFs'}<ArrowRight size={18} /></button></div>
          <div className="status-line" role="status" aria-live="polite">{busy === 'reading' ? 'Checking your files…' : busy === 'merging' ? 'Combining your pages on this device…' : entries.length === 0 ? 'Select at least two PDFs to get started.' : entries.length === 1 ? 'Add one more PDF to merge your files.' : `${entries.length} PDFs ready to merge.`}</div>
          {busy === 'merging' && <progress aria-label="Merge progress" max={100} value={progress} />}
          {result && <section className="result" aria-label="Merged PDF result"><CheckCircle2 size={27} /><div><h3 tabIndex={-1} ref={resultFocus}>Your PDF is ready.</h3><p>{countLabel(result.files,'file')}, together. {countLabel(result.pages,'page')} · {formatBytes(result.size)}</p><DownloadButton href={result.url} download={outputFilename(filename)} label="Download PDF" /><p className="download-hint">You can download again until you change the file list or leave this page.</p></div></section>}
          {result && <AdSlot position="download"/>}
        <div className="panel-privacy"><LockKeyhole size={13} /> Your files stay yours. Nothing is uploaded.</div>
        </section>
        <div className="tool-sidebar"><aside className="side-panel"><div className="panel-heading"><h2>The final file</h2><span>PDF</span></div><div className="document-preview" aria-hidden="true"><div className="preview-binding" /><div className="preview-page"><span>Zipora</span><FileText /><strong>{totalPages || '-'}</strong><small>{pluralize(totalPages,'page')}, together</small><i /><i /><i /></div></div><dl className="document-stats"><div><dt>Documents</dt><dd>{entries.length || '-'}</dd></div><div><dt>Pages</dt><dd>{totalPages || '-'}</dd></div><div><dt>Output</dt><dd>One PDF</dd></div></dl><div className="privacy-note"><LockKeyhole /><div><h3>A private workspace</h3><p>Your browser does the merging. Your documents never leave this device.</p></div></div><ul className="plain-benefits"><li><Check />No account</li><li><Check />No watermarks</li><li><Check />Free to use</li></ul></aside><AdSlot position="sidebar"/></div>
      </div>
      <ToolSections slug="merge-pdf" />
    </main>
    
    <SiteFooter />
  </>;
}

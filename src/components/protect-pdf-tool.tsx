'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, Upload } from 'lucide-react';
import { formatBytes, outputFilename } from '@/lib/pdf';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

const maxBytes = 50 * 1024 * 1024;
const field = 'block w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm';

export function ProtectPdfTool() {
  const picker = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const mounted = useRef(false);
  const [ready, setReady] = useState(false);
  const [file, setFile] = useState<File>();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Blob>();
  const url = useBlobUrl(result);
  const mismatch = confirmation.length > 0 && password !== confirmation;
  const invalidPassword = [...password].length < 8 || new TextEncoder().encode(password).byteLength > 127 || password.includes('\0');
  const filename = file ? outputFilename(file.name.replace(/\.pdf$/i, '') + '-protected') : 'protected.pdf';

  useEffect(() => {
    mounted.current = true;
    setReady(true);
    return () => {
      mounted.current = false;
      worker.current?.terminate();
      worker.current = null;
    };
  }, []);

  function choose(files: FileList | null) {
    if (!ready || worker.current || !files?.length) return;
    setResult(undefined);
    setError('');
    setFile(undefined);
    setPassword('');
    setConfirmation('');
    setVisible(false);
    if (files.length !== 1) { setError('Choose one PDF at a time.'); return; }
    if (!files[0].size || files[0].size > maxBytes) { setError('Choose a non-empty PDF up to 50 MB.'); return; }
    setFile(files[0]);
  }

  async function protect() {
    if (!file || worker.current || invalidPassword || password !== confirmation) return;
    setBusy(true);
    setError('');
    setResult(undefined);
    let job: Worker | undefined;
    try {
      job = new Worker('/protect-pdf.worker.js');
      worker.current = job;
      const output = await new Promise<ArrayBuffer>((resolve, reject) => {
        job!.onmessage = ({ data }) => {
          if (data.bytes instanceof ArrayBuffer) resolve(data.bytes);
          else reject(new Error(data.error || 'Could not protect this PDF.'));
        };
        job!.onerror = event => { event.preventDefault(); reject(new Error('The encryption engine could not start. Reload and try again.')); };
        job!.onmessageerror = () => reject(new Error('Could not read the encrypted result. Try again.'));
        job!.postMessage({ file, password });
      });
      if (!mounted.current) return;
      setResult(new Blob([output], { type: 'application/pdf' }));
      setPassword('');
      setConfirmation('');
      setVisible(false);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not protect this PDF.');
    } finally {
      job?.terminate();
      if (worker.current === job) worker.current = null;
      if (mounted.current) setBusy(false);
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="Protect PDF workspace" aria-busy={busy}>
      <div className="panel-heading"><h2>Your PDF</h2>{file && <span>{formatBytes(file.size)}</span>}</div>
      <div className={`drop-zone ${file ? 'is-compact' : ''} ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files); }}>
        <input ref={picker} type="file" accept=".pdf,application/pdf" aria-label="Choose PDF" className="sr-only" tabIndex={-1}
          disabled={!ready || busy} onChange={event => { choose(event.target.files); event.target.value = ''; }} />
        <h3 className="break-all">{file?.name ?? 'Choose a PDF to protect'}</h3>
        {!file && <p>One unlocked PDF up to 50 MB</p>}
        <button type="button" className="upload-button" disabled={!ready || busy} onClick={() => picker.current?.click()}>
          <Upload aria-hidden="true" />{file ? 'Choose another PDF' : 'Select PDF'}
        </button>
      </div>
      {file && !result && <fieldset disabled={busy} aria-label="PDF password" className="mt-6 grid min-w-0 gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-medium">Password to open the PDF</h3>
          <button type="button" className="secondary-action" aria-pressed={visible} onClick={() => setVisible(!visible)}>
            {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
            {visible ? 'Hide passwords' : 'Show passwords'}
          </button>
        </div>
        <label className="grid gap-1 text-sm">Password
          <input className={field} type={visible ? 'text' : 'password'} autoComplete="new-password" spellCheck={false}
            value={password} aria-describedby="protect-password-hint" onChange={event => { setPassword(event.target.value); setError(''); }} />
        </label>
        <p id="protect-password-hint" className="text-sm">Use at least 8 characters. The PDF format allows up to 127 bytes.</p>
        <label className="grid gap-1 text-sm">Confirm password
          <input className={field} type={visible ? 'text' : 'password'} autoComplete="new-password" spellCheck={false}
            value={confirmation} aria-invalid={mismatch} onChange={event => { setConfirmation(event.target.value); setError(''); }}
            onKeyDown={event => { if (event.key === 'Enter') void protect(); }} />
        </label>
        {mismatch && <p className="text-sm" role="status">Passwords do not match.</p>}
        {new TextEncoder().encode(password).byteLength > 127 && <p className="text-sm" role="status">Use a shorter password.</p>}
        <button type="button" className="primary" disabled={busy || invalidPassword || password !== confirmation} onClick={() => void protect()}>
          <LockKeyhole size={18} aria-hidden="true" />{busy ? 'Encrypting PDF…' : 'Protect PDF'}
        </button>
      </fieldset>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {url && <><div className="result">
        <div><h3>Your protected PDF is ready</h3><p className="break-all">{filename}</p></div>
        <DownloadButton href={url} download={filename} label="Download PDF" />
      </div><AdSlot position="download" /></>}
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Password protection</h2><LockKeyhole size={18} aria-hidden="true" /></div>
        <p>Keep the password somewhere safe. You’ll need it each time you open the protected copy.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

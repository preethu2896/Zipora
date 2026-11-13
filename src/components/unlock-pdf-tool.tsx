'use client';

import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, LockKeyholeOpen, Upload } from 'lucide-react';
import { formatBytes, outputFilename } from '@/lib/pdf';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

export function UnlockPdfTool() {
  const picker = useRef<HTMLInputElement>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const [ready, setReady] = useState(false);
  const [file, setFile] = useState<File>();
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  const [result, setResult] = useState<Blob>();
  const url = useBlobUrl(result);
  const filename = file ? outputFilename(file.name.replace(/\.pdf$/i, '') + '-unlocked') : 'unlocked.pdf';

  useEffect(() => {
    setReady(true);
    return () => {
      worker.current?.terminate();
      worker.current = null;
    };
  }, []);

  useEffect(() => {
    if (needsPassword && !busy) passwordField.current?.focus();
  }, [needsPassword, busy]);

  function choose(files: FileList | null) {
    if (!ready || worker.current || !files?.length) return;
    setResult(undefined);
    setError('');
    setNeedsPassword(false);
    setFile(undefined);
    setPassword('');
    setVisible(false);
    if (files.length !== 1) { setError('Choose one PDF at a time.'); return; }
    if (!files[0].size || files[0].size > 50 * 1024 * 1024) { setError('Choose a non-empty PDF up to 50 MB.'); return; }
    setFile(files[0]);
  }

  function unlock() {
    if (!file || worker.current) return;
    if (password.includes('\0')) {
      setError('The password contains an unsupported character.');
      setNeedsPassword(true);
      return;
    }
    setBusy(true);
    setError('');
    setNeedsPassword(false);
    let job: Worker | undefined;

    function finish(message: { bytes?: ArrayBuffer; error?: string; needsPassword?: boolean }) {
      job?.terminate();
      worker.current = null;
      setBusy(false);
      if (message.bytes instanceof ArrayBuffer) {
        setResult(new Blob([message.bytes], { type: 'application/pdf' }));
        setPassword('');
        setVisible(false);
      } else {
        setError(message.error || 'Could not read the unlocked PDF. Try again.');
        setNeedsPassword(Boolean(message.needsPassword));
      }
    }

    const engineError = { error: 'The PDF engine could not start. Reload and try again.' };
    try {
      job = new Worker('/unlock-pdf.worker.js');
      worker.current = job;
      job.onmessage = ({ data }) => finish(data);
      job.onmessageerror = () => finish({});
      job.onerror = event => { event.preventDefault(); finish(engineError); };
      job.postMessage({ file, password });
    } catch {
      finish(engineError);
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="Unlock PDF workspace" aria-busy={busy}>
      <div className="panel-heading"><h2>Your PDF</h2>{file && <span>{formatBytes(file.size)}</span>}</div>
      <div className={`drop-zone ${file ? 'is-compact' : ''} ${dragging ? 'is-dragging' : ''}`}
        onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); choose(event.dataTransfer.files); }}>
        <input ref={picker} type="file" accept=".pdf,application/pdf" aria-label="Choose PDF" className="sr-only" tabIndex={-1}
          disabled={!ready || busy} onChange={event => { choose(event.target.files); event.target.value = ''; }} />
        <h3 className="break-all">{file?.name ?? 'Choose a PDF to unlock'}</h3>
        {!file && <p>One PDF up to 50 MB</p>}
        <button type="button" className="upload-button" disabled={!ready || busy} onClick={() => picker.current?.click()}>
          <Upload aria-hidden="true" />{file ? 'Choose another PDF' : 'Select PDF'}
        </button>
      </div>
      {file && !result && <form className="mt-6" onSubmit={event => { event.preventDefault(); unlock(); }}>
        <fieldset disabled={busy} className="grid min-w-0 gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label htmlFor="unlock-password" className="text-sm font-medium">PDF password</label>
            <button type="button" className="secondary-action" onClick={() => setVisible(!visible)}>
              {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              {visible ? 'Hide password' : 'Show password'}
            </button>
          </div>
          <input ref={passwordField} id="unlock-password" type={visible ? 'text' : 'password'} autoComplete="off"
            spellCheck={false} autoCapitalize="none" aria-invalid={needsPassword}
            aria-describedby={needsPassword ? 'unlock-error unlock-hint' : 'unlock-hint'}
            className="w-full min-w-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm"
            value={password} onChange={event => { setPassword(event.target.value); setError(''); setNeedsPassword(false); }} />
          <p id="unlock-hint" className="text-sm">Leave blank if the PDF opens without a password.</p>
          <button type="submit" className="primary" disabled={busy}>
            <LockKeyholeOpen size={18} aria-hidden="true" />{busy ? 'Unlocking PDF…' : 'Unlock PDF'}
          </button>
        </fieldset>
      </form>}
      {error && <p id="unlock-error" className="error-message" role="alert">{error}</p>}
      {url && <><div className="result" aria-live="polite">
        <div><h3>Your unlocked PDF is ready</h3><p className="break-all">{filename}</p></div>
        <DownloadButton href={url} download={filename} label="Download PDF" />
      </div><AdSlot position="download" /></>}
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Unlocked copy</h2><LockKeyholeOpen size={18} aria-hidden="true" /></div>
        <p>The downloaded copy opens without a password. Keep the original if you still need its protection.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

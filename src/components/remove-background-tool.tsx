'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

export function RemoveBackgroundTool() {
  const picker = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState<Blob>();
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const sourceUrl = useBlobUrl(file);
  const outputUrl = useBlobUrl(result);

  useEffect(() => {
    setReady(true);
    return () => {
      clearTimeout(timer.current);
      worker.current?.terminate();
    };
  }, []);

  function choose(files: FileList | null) {
    setResult(undefined);
    setError('');
    if (files?.length !== 1 || !files[0].size || files[0].size > 20 * 1024 * 1024) {
      setFile(undefined);
      setError('Choose one non-empty image up to 20 MB.');
      return;
    }
    setFile(files[0]);
  }

  function stop() {
    clearTimeout(timer.current);
    worker.current?.terminate();
    worker.current = null;
    setStatus('');
  }

  function remove() {
    if (!file || status) return;
    setError('');
    setResult(undefined);
    setStatus('Preparing image…');
    const engineError = 'The local model could not start. Try an up-to-date browser.';
    try {
      const engine = worker.current ?? new Worker(new URL('../lib/remove-background.worker.ts', import.meta.url), { type: 'module' });
      worker.current = engine;
      engine.onmessage = ({ data }) => {
        if (data.status) { setStatus(data.status); return; }
        clearTimeout(timer.current);
        setStatus('');
        if (data.blob instanceof Blob && data.blob.size) setResult(data.blob);
        else setError(data.error || 'Could not create a PNG. Try another image.');
      };
      engine.onerror = event => { event.preventDefault(); stop(); setError(engineError); };
      engine.onmessageerror = () => { stop(); setError(engineError); };
      timer.current = setTimeout(() => { stop(); setError('Processing took too long. Try a smaller image.'); }, 90_000);
      engine.postMessage(file);
    } catch {
      stop();
      setError(engineError);
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="Remove Background workspace" aria-busy={Boolean(status)}>
      <div className={`drop-zone ${file ? 'is-compact' : ''}`}>
        <h2 className="break-all">{file?.name ?? 'Choose an image'}</h2>
        <p>JPG, PNG or WebP · up to 20 MB</p>
        <input ref={picker} type="file" className="sr-only" aria-label="Choose image"
          accept="image/jpeg,image/png,image/webp" disabled={!ready || Boolean(status)}
          onChange={event => { choose(event.target.files); event.target.value = ''; }}/>
        <button type="button" className="upload-button" disabled={!ready || Boolean(status)} onClick={() => picker.current?.click()}>
          <Upload aria-hidden="true"/>{file ? 'Choose another image' : 'Select image'}
        </button>
      </div>
      {sourceUrl && <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <figure className="min-w-0"><figcaption className="mb-2 text-sm font-medium">Original</figcaption>
          <img className="max-h-72 max-w-full object-contain" src={sourceUrl} alt="Original image"/>
        </figure>
        {outputUrl && <figure className="min-w-0"><figcaption className="mb-2 text-sm font-medium">Transparent PNG</figcaption>
          <img className="max-h-72 max-w-full object-contain [background:repeating-conic-gradient(#e2e8f0_0%_25%,white_0%_50%)_50%_/_16px_16px]" src={outputUrl} alt="Image with background removed"/>
        </figure>}
      </div>}
      {file && !outputUrl && <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="primary" disabled={Boolean(status)} onClick={remove}>Remove background</button>
        {status && <button type="button" className="secondary-action" onClick={stop}>Cancel</button>}
      </div>}
      {status && <p role="status" className="mt-3 text-sm">{status}</p>}
      {error && <p role="alert" className="error-message">{error}</p>}
      {outputUrl && <><div className="result max-sm:flex-col! max-sm:items-start!">
        <h3>Your PNG is ready</h3>
        <DownloadButton href={outputUrl} download={`${file?.name.replace(/\.[^.]+$/, '') || 'image'}-transparent.png`} label="Download PNG"/>
      </div><AdSlot position="download"/></>}
    </section>
    <div className="tool-sidebar"><aside className="side-panel">
      <h2>Check the edges</h2>
      <p>The model finds the main subject. Review fine details such as hair, fur, and transparent objects before saving.</p>
      <p>The first run downloads the model and runtime. Processing happens on your device.</p>
    </aside><AdSlot position="sidebar"/></div>
  </div>;
}

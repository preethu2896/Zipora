'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { formatBytes } from '@/lib/pdf';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

export function VideoCompressorTool() {
  const picker = useRef<HTMLInputElement>(null);
  const worker = useRef<Worker | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [file, setFile] = useState<File>();
  const [preset, setPreset] = useState('balanced');
  const [progress, setProgress] = useState<number>();
  const [error, setError] = useState('');
  const [result, setResult] = useState<Blob>();
  const busy = progress !== undefined;
  const original = useBlobUrl(file);
  const output = useBlobUrl(result);

  useEffect(() => {
    setReady(true);
    return () => {
      clearTimeout(timer.current);
      worker.current?.terminate();
    };
  }, []);

  function stop() {
    clearTimeout(timer.current);
    worker.current?.terminate();
    worker.current = null;
    setProgress(undefined);
  }

  function choose(files: FileList | null) {
    setResult(undefined);
    setError('');
    if (files?.length !== 1 || !files[0].size || files[0].size > 100 * 1024 * 1024) {
      setFile(undefined);
      setError('Choose one non-empty video up to 100 MB.');
      return;
    }
    setFile(files[0]);
  }

  function compress() {
    if (!file || worker.current) return;
    setProgress(0);
    setError('');
    setResult(undefined);
    const failed = 'The video encoder could not start. Try desktop Chrome or Edge.';
    try {
      const engine = new Worker(new URL('../lib/video-compressor.worker.ts', import.meta.url), { type: 'module' });
      worker.current = engine;
      engine.onmessage = ({ data }) => {
        if (typeof data.progress === 'number') { setProgress(data.progress); return; }
        stop();
        if (data.blob instanceof Blob && data.blob.size) setResult(data.blob);
        else setError(data.error || failed);
      };
      engine.onerror = event => { event.preventDefault(); stop(); setError(failed); };
      engine.onmessageerror = () => { stop(); setError(failed); };
      timer.current = setTimeout(() => { stop(); setError('Compression took too long. Try a shorter clip or a smaller preset.'); }, 180_000);
      engine.postMessage({ file, preset });
    } catch {
      stop();
      setError(failed);
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="Video Compressor workspace" aria-busy={busy}>
      <div className={`drop-zone ${file ? 'is-compact' : ''}`}>
        <h2 className="break-all">{file?.name ?? 'Choose a video'}</h2>
        <p>MP4, WebM or MOV · up to 100 MB and 5 minutes</p>
        <input ref={picker} type="file" className="sr-only" aria-label="Choose video"
          accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime" disabled={!ready || busy}
          onChange={event => { choose(event.target.files); event.target.value = ''; }}/>
        <button type="button" className="upload-button" disabled={!ready || busy} onClick={() => picker.current?.click()}>
          <Upload aria-hidden="true"/>{file ? 'Choose another video' : 'Select video'}
        </button>
      </div>
      {file && <fieldset className="tool-options" disabled={busy}>
        <legend>Compression settings</legend>
        <label>Compression preset<select value={preset} onChange={event => { setPreset(event.target.value); setError(''); setResult(undefined); }}>
          <option value="smaller">Smaller file · up to 480p</option>
          <option value="balanced">Balanced · up to 720p</option>
          <option value="higher">Higher quality · up to 1080p</option>
        </select></label>
      </fieldset>}
      {original && <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <figure className="min-w-0"><figcaption>Original · {formatBytes(file!.size)}</figcaption>
          <video className="mt-2 max-h-72 w-full" src={original} controls playsInline preload="metadata"/>
        </figure>
        {output && result && <figure className="min-w-0"><figcaption>Compressed · {formatBytes(result.size)}</figcaption>
          <video className="mt-2 max-h-72 w-full" src={output} controls playsInline preload="metadata"/>
        </figure>}
      </div>}
      {file && !output && <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="primary" disabled={busy} onClick={compress}>Compress video</button>
        {busy && <button type="button" className="secondary-action" onClick={stop}>Cancel</button>}
      </div>}
      {busy && <div className="mt-3"><p role="status">{progress === 0 ? 'Preparing video…' : `Compressing · ${progress}%`}</p>
        <progress aria-label="Compression progress" max={100} value={progress} className="w-full"/>
      </div>}
      {error && <p role="alert" className="error-message">{error}</p>}
      {file && output && result && <><div className="result max-sm:flex-col! max-sm:items-start!">
        <div><h3>Your MP4 is ready</h3><p>{formatBytes(file.size - result.size)} smaller</p></div>
        <DownloadButton href={output} download={`${file.name.replace(/\.[^.]+$/, '')}-compressed.mp4`} label="Download MP4"/>
      </div><AdSlot position="download"/></>}
    </section>
    <div className="tool-sidebar"><aside className="side-panel">
      <h2>Check the result</h2>
      <p>Balanced is a good starting point. Compare playback and file size before replacing the original.</p>
      <p>Use desktop Chrome or Edge for the broadest support. Encoding depends on the codecs available in your browser.</p>
    </aside><AdSlot position="sidebar"/></div>
  </div>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { canvasBlob, readImage } from '@/lib/image-processing';
import { outputFilename } from '@/lib/pdf';
import { DownloadButton } from './buttons/download-button';
import { AdSlot } from './site-chrome';
import { useBlobUrl } from './use-blob-url';

export function GeminiCleanup({ video }: { video: boolean }) {
  const picker = useRef<HTMLInputElement>(null);
  const runtime = useRef<HTMLIFrameElement>(null);
  const job = useRef(0);
  const [file, setFile] = useState<File>();
  const [result, setResult] = useState<Blob>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const original = useBlobUrl(file);
  const processed = useBlobUrl(result);

  useEffect(() => () => { job.current++; }, []);
  useEffect(() => {
    if (!busy || !video) return;
    function receive(event: MessageEvent) {
      if (event.origin !== location.origin || event.source !== runtime.current?.contentWindow) return;
      if (event.data?.type === 'gemini-result' && event.data.blob instanceof Blob && event.data.blob.size) {
        setResult(event.data.blob);
      } else if (event.data?.type === 'gemini-error') {
        setError('Could not export this clip. Check that it contains a supported mark and try a short MP4 in Chrome or Edge.');
      } else return;
      setBusy(false);
    }
    window.addEventListener('message', receive);
    const timer = setTimeout(() => {
      setBusy(false);
      setError('Video cleanup took too long. Try a shorter clip.');
    }, 120_000);
    return () => { clearTimeout(timer); window.removeEventListener('message', receive); };
  }, [busy, video]);

  function choose(files: FileList | null) {
    setError('');
    setResult(undefined);
    setFile(undefined);
    if (files?.length !== 1 || !files[0].size || files[0].size > (video ? 50 : 20) * 1024 * 1024) {
      setError(video ? 'Choose one non-empty video up to 50 MB.' : 'Choose one non-empty image up to 20 MB.');
      return;
    }
    setFile(files[0]);
  }

  async function clean() {
    if (!file || busy) return;
    setBusy(true);
    setResult(undefined);
    setError('');
    if (video) return;
    const current = ++job.current;
    try {
      const { image } = await readImage(file);
      try {
        if (image.width * image.height > 16_000_000 || Math.max(image.width, image.height) > 8192) {
          throw new Error('Choose an image up to 16 megapixels and 8192 pixels per side.');
        }
        const { removeWatermarkFromImage } = await import('@pilio/gemini-watermark-remover/browser');
        const source = document.createElement('canvas');
        source.width = image.width;
        source.height = image.height;
        const context = source.getContext('2d');
        if (!context) throw new Error('Your browser could not open an image canvas.');
        context.drawImage(image, 0, 0);
        const { canvas, meta } = await removeWatermarkFromImage(source);
        if (!meta?.applied) throw new Error('No supported Gemini watermark was detected in this image.');
        const blob = canvas instanceof HTMLCanvasElement ? await canvasBlob(canvas, 'image/png') : await canvas.convertToBlob({ type: 'image/png' });
        if (job.current === current) setResult(blob);
      } finally { image.close(); }
    } catch (cause) {
      if (job.current === current) setError(cause instanceof Error ? cause.message : 'Could not process this image.');
    } finally {
      if (job.current === current) setBusy(false);
    }
  }

  const extension = video ? 'mp4' : 'png';
  const filename = outputFilename((file?.name.replace(/\.[^.]+$/, '') || 'gemini') + '-cleaned').replace(/pdf$/, extension);
  return <div className="workspace">
    <section className="tool-panel" aria-label="Gemini watermark workspace" aria-busy={busy}>
      <div className={`drop-zone ${file ? 'is-compact' : ''}`}>
        <h2 className="break-all">{file?.name ?? (video ? 'Choose a Gemini or Veo clip' : 'Choose a Gemini image')}</h2>
        <p>{video ? 'MP4, WebM or MOV · up to 50 MB' : 'PNG, JPG or WebP · up to 20 MB'}</p>
        <input ref={picker} type="file" className="sr-only" aria-label={video ? 'Choose video' : 'Choose image'}
          accept={video ? '.mp4,.mov,.webm,video/mp4,video/webm,video/quicktime' : 'image/png,image/jpeg,image/webp'}
          disabled={busy} onChange={event => { choose(event.target.files); event.target.value = ''; }} />
        <button type="button" className="upload-button" disabled={busy} onClick={() => picker.current?.click()}>
          <Upload aria-hidden="true"/>{file ? 'Choose another file' : video ? 'Select video' : 'Select image'}
        </button>
      </div>
      {original && <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[['Original', original], ['Cleaned', processed]].map(([label, src]) => src && <figure key={label} className="min-w-0">
          <figcaption className="mb-2 text-sm font-medium">{label}</figcaption>
          {video ? <video className="max-h-72 w-full" src={src} controls playsInline preload="metadata"/> :
            <img className="max-h-72 max-w-full object-contain" src={src} alt={label + ' Gemini image'}/>}
        </figure>)}
      </div>}
      {file && !processed && <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="primary" disabled={busy} onClick={() => void clean()}>{busy ? 'Processing…' : 'Remove watermark'}</button>
        {video && busy && <button type="button" className="secondary-action" onClick={() => setBusy(false)}>Cancel</button>}
      </div>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {processed && <><div className="result max-sm:flex-col! max-sm:items-start!">
        <h3>Your {video ? 'video' : 'image'} is ready</h3>
        <DownloadButton href={processed} download={filename} label={`Download ${extension.toUpperCase()}`}/>
      </div><AdSlot position="download"/></>}
      {video && busy && <iframe ref={runtime} hidden title="Local video processing engine" src="/gemini-runtime/"
        onLoad={() => runtime.current?.contentWindow?.postMessage({ type: 'gemini-run', file }, location.origin)}/>}
    </section>
    <div className="tool-sidebar"><aside className="side-panel">
      <h2>Check the cleaned area</h2>
      <p>Use files you own or have permission to edit. Compare the original and cleaned result before downloading.</p>
      {video && <p>Use desktop Chrome or Edge and start with a short clip. Export re-encodes the video. Audio depends on the source codec.</p>}
    </aside><AdSlot position="sidebar"/></div>
  </div>;
}

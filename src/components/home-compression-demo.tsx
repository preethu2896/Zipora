'use client';

import { useEffect, useState } from 'react';
import { renderImage, type ImageFormat } from '@/lib/image-processing';
import { formatBytes } from '@/lib/pdf';
import { useBlobUrl } from './use-blob-url';

const samplePath = '/home-compression-sample.png';
const formats = [['JPG', 'image/jpeg'], ['PNG', 'image/png'], ['WebP', 'image/webp']] as const;
const presets = [['Smallest', 45], ['Balanced', 80], ['Best quality', 95]] as const;

export function HomeCompressionDemo() {
  const [source, setSource] = useState<Blob>();
  const [format, setFormat] = useState<ImageFormat>('image/jpeg');
  const [quality, setQuality] = useState(80);
  const [position, setPosition] = useState(50);
  const [result, setResult] = useState<{ format: ImageFormat; quality: number; blob: Blob }>();
  const [error, setError] = useState('');
  const current = result?.format === format && result.quality === quality ? result.blob : undefined;
  const optimized = useBlobUrl(current);
  const reduction = source && current ? 100 * (1 - current.size / source.size) : undefined;

  useEffect(() => {
    const controller = new AbortController();
    fetch(samplePath, { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('Sample unavailable');
      return response.blob();
    }).then(setSource).catch(() => {
      if (!controller.signal.aborted) setError('The sample could not load. Try the full Image Compressor below.');
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!source) return;
    let active = true;
    const timer = window.setTimeout(async () => {
      setError('');
      try {
        const image = await createImageBitmap(source);
        try {
          const blob = await renderImage(image, image.width, image.height, format, quality / 100);
          if (active) setResult({ format, quality, blob });
        } finally { image.close(); }
      } catch {
        if (active) setError('This format could not be encoded. Try another format.');
      }
    }, 100);
    return () => { active = false; window.clearTimeout(timer); };
  }, [source, format, quality]);

  return <div className="home-demo">
    <div className="home-demo-controls">
      <fieldset><legend>Format</legend><div className="home-demo-chips">
        {formats.map(([label, value]) => <button type="button" key={value} aria-pressed={format === value} onClick={() => setFormat(value)}>{label}</button>)}
      </div></fieldset>
      <label className="home-quality">Quality <span>{format === 'image/png' ? 'Lossless' : `${quality}%`}</span>
        <input type="range" min="10" max="100" value={quality} disabled={format === 'image/png'} onChange={event => setQuality(+event.target.value)}/>
      </label>
      <fieldset><legend>Presets</legend><div className="home-demo-chips">
        {presets.map(([label, value]) => <button type="button" key={value} aria-pressed={format !== 'image/png' && quality === value}
          onClick={() => { if (format === 'image/png') setFormat('image/jpeg'); setQuality(value); }}>{label}</button>)}
      </div></fieldset>
      <p>Try a different format or quality. The sample is encoded on your device.</p>
    </div>
    <div className="home-demo-output">
      <div className="home-image-compare">
        <img src={samplePath} alt="Earth photographed by the Apollo 17 crew" loading="lazy"/>
        {optimized && <img src={optimized} alt="" style={{ clipPath: `inset(0 0 0 ${position}%)` }}/>}
        <span className="home-compare-left">Original</span><span className="home-compare-right">Compressed</span>
        <span className="home-compare-divider" style={{ left: `${position}%` }} aria-hidden="true"><b>↔</b></span>
        <input type="range" min="0" max="100" value={position} aria-label="Compare original and compressed image"
          onChange={event => setPosition(+event.target.value)}/>
      </div>
      <dl className="home-demo-stats" aria-live="polite" aria-label="Compression results">
        <div><dt>Original</dt><dd>{source ? formatBytes(source.size) : '—'}</dd></div>
        <div><dt>Compressed</dt><dd>{current ? formatBytes(current.size) : '—'}</dd></div>
        <div><dt>Reduction</dt><dd className={reduction !== undefined && reduction > 0 ? 'home-savings' : ''}>
          {reduction === undefined ? '—' : reduction >= 0 ? `${reduction.toFixed(1)}%` : `${(-reduction).toFixed(1)}% larger`}
        </dd></div>
      </dl>
      {error && <p role="alert">{error}</p>}
    </div>
  </div>;
}

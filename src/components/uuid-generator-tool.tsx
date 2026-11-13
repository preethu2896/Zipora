'use client';

import { useState } from 'react';
import { Fingerprint } from 'lucide-react';
import { generateUuids, maxUuidCount } from '@/lib/uuid-generator';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

export function UuidGeneratorTool() {
  const [quantity, setQuantity] = useState('1');
  const [result, setResult] = useState<{ text: string; count: number; blob: Blob }>();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const url = useBlobUrl(result?.blob);

  function generate() {
    setStatus('');
    setError('');
    try {
      const ids = generateUuids(Number(quantity));
      const text = ids.join('\n');
      setResult({ text, count: ids.length, blob: new Blob([text + '\n'], { type: 'text/plain' }) });
    } catch (cause) {
      setResult(undefined);
      setError(cause instanceof Error ? cause.message : 'Could not generate UUIDs.');
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setStatus('Copied to clipboard.');
    } catch {
      setStatus('Clipboard unavailable. Select and copy the UUIDs manually.');
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="UUID generator workspace">
      <div className="panel-heading"><h2>Generate UUIDs</h2><Fingerprint size={20} aria-hidden="true" /></div>
      <form className="flex flex-wrap items-end gap-3" noValidate onSubmit={event => { event.preventDefault(); generate(); }}>
        <label className="grid gap-1 text-sm">Quantity
          <input className="w-32 rounded-lg border border-neutral-300 bg-white px-3 py-2"
            type="number" min={1} max={maxUuidCount} step={1} value={quantity}
            onChange={event => { setQuantity(event.target.value); setError(''); setStatus(''); }} />
        </label>
        <button className="primary" type="submit">Generate UUIDs</button>
      </form>
      <p className="mt-2 text-sm">Choose 1 to 1,000 random version 4 UUIDs.</p>
      {error && <p className="error-message" role="alert">{error}</p>}
      {result && <div className="mt-5 grid min-w-0 gap-3">
        <label className="grid gap-2 text-sm font-medium">Generated UUIDs
          <textarea readOnly spellCheck={false} wrap="off" value={result.text} rows={result.count === 1 ? 2 : 8}
            className="w-full resize-y rounded-lg border border-neutral-300 bg-white p-3 font-mono text-xs sm:text-sm" />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="secondary-action" onClick={() => void copy()}>Copy UUIDs</button>
          {url && <DownloadButton href={url} download="zipora-uuids.txt" label="Download TXT" />}
        </div>
        <p role="status" className="text-sm">{status || `${result.count.toLocaleString('en')} ${result.count === 1 ? 'UUID' : 'UUIDs'} generated.`}</p>
      </div>}
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>UUID version 4</h2></div>
        <p>Random identifiers in the standard 8-4-4-4-12 format, generated in your browser.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

'use client';

import { useMemo, useState } from 'react';
import { Link2 } from 'lucide-react';
import { AdSlot } from './site-chrome';

const editor = 'min-h-40 w-full resize-y rounded-lg border border-neutral-300 bg-white p-3 font-mono text-sm';
const example = 'café & tea + lemon';

export function UrlEncoderTool() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [scope, setScope] = useState<'component' | 'url'>('component');
  const [status, setStatus] = useState('');
  const { output, error } = useMemo(() => {
    try {
      const transform = mode === 'encode'
        ? scope === 'url' ? encodeURI : encodeURIComponent
        : scope === 'url' ? decodeURI : decodeURIComponent;
      return { output: transform(input), error: '' };
    } catch {
      return { output: '', error: mode === 'decode'
        ? 'Invalid percent encoding. Check for an incomplete escape or invalid UTF-8.'
        : 'This text contains an invalid Unicode character.' };
    }
  }, [input, mode, scope]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(output);
      setStatus('Copied to clipboard.');
    } catch {
      setStatus('Clipboard unavailable. Select and copy the output manually.');
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="URL encoder workspace">
      <div className="panel-heading"><h2>Encode or decode</h2><Link2 size={20} aria-hidden="true" /></div>
      <div className="grid min-w-0 gap-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-sm">Action
            <select value={mode} className="min-w-0 rounded-lg border border-neutral-300 bg-white px-2 py-2"
              onChange={event => { setMode(event.target.value === 'decode' ? 'decode' : 'encode'); setStatus(''); }}>
              <option value="encode">Encode</option><option value="decode">Decode</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm">Input type
            <select value={scope} className="min-w-0 rounded-lg border border-neutral-300 bg-white px-2 py-2"
              onChange={event => { setScope(event.target.value === 'url' ? 'url' : 'component'); setStatus(''); }}>
              <option value="component">URL component</option><option value="url">Full URL</option>
            </select>
          </label>
        </div>
        <p className="text-sm">{scope === 'component' ? 'For a query value or one path segment.' : 'Keeps URL separators such as /, ?, and &.'}</p>
        <label className="grid gap-2 text-sm font-medium">Input
          <textarea className={editor} value={input} maxLength={100000} spellCheck={false}
            onChange={event => { setInput(event.target.value); setStatus(''); }} placeholder={mode === 'encode' ? 'Paste a URL or text to encode' : 'Paste percent-encoded text'} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="secondary-action" onClick={() => {
            setInput(mode === 'decode' ? encodeURIComponent(example) : example);
            setScope('component');
            setStatus('');
          }}>Load example</button>
          <button type="button" className="secondary-action" disabled={!input} onClick={() => { setInput(''); setStatus(''); }}>Clear</button>
        </div>
        {error && <p className="error-message" role="alert">{error}</p>}
        <label className="grid gap-2 text-sm font-medium">Output
          <textarea className={editor} readOnly value={output} spellCheck={false} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="primary" disabled={!output} onClick={() => void copy()}>Copy output</button>
          <button type="button" className="secondary-action" disabled={!output || output.length > 100000} onClick={() => {
            setInput(output);
            setMode(mode === 'encode' ? 'decode' : 'encode');
            setStatus('');
          }}>Reverse direction</button>
        </div>
        {status && <p role="status" className="text-sm">{status}</p>}
      </div>
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Percent encoding</h2></div>
        <p>A space becomes %20. A literal plus remains a plus when decoding. Your input stays in this browser.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

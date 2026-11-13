'use client';

import { useState } from 'react';
import { Braces } from 'lucide-react';
import { formatJson } from '@/lib/format-json';
import { AdSlot } from './site-chrome';
import { DownloadButton } from './buttons/download-button';
import { useBlobUrl } from './use-blob-url';

const editor = 'min-h-56 w-full resize-y rounded-lg border border-neutral-300 bg-white p-3 font-mono text-sm';
const example = '{"project":"Zipora","tools":["Format","Minify"],"private":true}';

export function JsonFormatterTool() {
  const [input, setInput] = useState('');
  const [indent, setIndent] = useState('2');
  const [result, setResult] = useState<{ text: string; blob: Blob }>();
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const url = useBlobUrl(result?.blob);

  function clearOutput() {
    setResult(undefined);
    setError('');
    setStatus('');
  }

  function run(minify: boolean) {
    clearOutput();
    try {
      const text = formatJson(input, minify ? null : indent === 'tab' ? '\t' : ' '.repeat(Number(indent)));
      setResult({ text, blob: new Blob([text], { type: 'application/json' }) });
      setStatus(minify ? 'JSON minified.' : 'JSON formatted.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not format this JSON.');
    }
  }

  function validate() {
    setError('');
    setStatus('');
    try {
      JSON.parse(input);
      setStatus('Valid JSON.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invalid JSON.');
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.text);
      setStatus('Copied to clipboard.');
    } catch {
      setStatus('Clipboard unavailable. Select and copy the output manually.');
    }
  }

  return <div className="workspace">
    <section className="tool-panel" aria-label="JSON formatter workspace">
      <div className="panel-heading"><h2>JSON workspace</h2><Braces size={20} aria-hidden="true" /></div>
      <div className="grid min-w-0 gap-4">
        <label className="grid gap-2 text-sm font-medium">Input JSON
          <textarea className={editor} maxLength={500000} value={input} spellCheck={false}
            placeholder="Paste JSON here" onChange={event => { setInput(event.target.value); clearOutput(); }} />
        </label>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm">Indentation
            <select className="rounded-lg border border-neutral-300 bg-white px-3 py-2" value={indent} onChange={event => { setIndent(event.target.value); clearOutput(); }}>
              <option value="2">2 spaces</option><option value="4">4 spaces</option><option value="tab">Tab</option>
            </select>
          </label>
          <button type="button" className="secondary-action" onClick={() => { setInput(example); clearOutput(); }}>Load example</button>
          <button type="button" className="secondary-action" disabled={!input} onClick={() => { setInput(''); clearOutput(); }}>Clear</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="primary" disabled={!input.trim()} onClick={() => run(false)}>Format JSON</button>
          <button type="button" className="secondary-action" disabled={!input.trim()} onClick={validate}>Validate JSON</button>
          <button type="button" className="secondary-action" disabled={!input.trim()} onClick={() => run(true)}>Minify JSON</button>
        </div>
        {error && <p className="error-message break-all" role="alert">{error}</p>}
        <p role="status" className="text-sm">{status}</p>
        {result && <label className="grid gap-2 text-sm font-medium">Output JSON
          <textarea className={editor} readOnly value={result.text} spellCheck={false} />
        </label>}
        {url && <div className="flex flex-wrap gap-2">
          <button type="button" className="secondary-action" onClick={() => void copy()}>Copy JSON</button>
          <DownloadButton href={url} download="zipora.json" label="Download JSON" />
        </div>}
      </div>
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Output</h2><Braces size={18} aria-hidden="true" /></div>
        <p>Format for reading or minify for a compact copy. Your JSON stays in this browser.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

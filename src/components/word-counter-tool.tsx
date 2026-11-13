'use client';

import { useDeferredValue, useMemo, useState } from 'react';
import { Type } from 'lucide-react';
import { countText, durationLabel, readingRate, speakingRate } from '@/lib/word-counter';
import { AdSlot } from './site-chrome';

const example = 'A clear first draft makes the next edit easier. Read it aloud to catch awkward phrases.\n\nKeep the sentences that move the idea forward.';

export function WordCounterTool() {
  const [input, setInput] = useState('');
  const deferred = useDeferredValue(input);
  const counts = useMemo(() => countText(deferred), [deferred]);
  const entries = [
    ['Words', counts.words.toLocaleString('en')],
    ['Characters', counts.characters.toLocaleString('en')],
    ['Characters without spaces', counts.charactersWithoutSpaces.toLocaleString('en')],
    ['Sentences', counts.sentences.toLocaleString('en')],
    ['Paragraphs', counts.paragraphs.toLocaleString('en')],
    ['Reading time', durationLabel(counts.reading)],
    ['Speaking time', durationLabel(counts.speaking)],
  ];
  return <div className="workspace">
    <section className="tool-panel" aria-label="Word counter workspace">
      <div className="panel-heading"><h2>Your text</h2><Type size={20} aria-hidden="true" /></div>
      <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Text counts" aria-busy={input !== deferred}>
        {entries.map(([label, value]) => <div className="rounded-lg border border-neutral-200 px-3 py-2" key={label}>
          <dt className="text-sm">{label}</dt><dd className="text-lg font-medium tabular-nums">{value}</dd>
        </div>)}
      </dl>
      <label className="grid gap-2 text-sm font-medium">Text to count
        <textarea value={input} onChange={event => setInput(event.target.value)} maxLength={50000}
          placeholder="Paste or type your text here"
          className="min-h-64 w-full resize-y rounded-lg border border-neutral-300 bg-white p-3 text-base" />
      </label>
      <p className="mt-2 text-sm">Up to 50,000 characters. Counts update as you type.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="secondary-action" onClick={() => setInput(example)}>Load example</button>
        <button type="button" className="secondary-action" disabled={!input} onClick={() => setInput('')}>Clear text</button>
      </div>
    </section>
    <div className="tool-sidebar">
      <aside className="side-panel">
        <div className="panel-heading"><h2>Time estimates</h2></div>
        <p>Reading uses {readingRate} words per minute. Speaking uses {speakingRate}. Your text stays in this browser.</p>
      </aside>
      <AdSlot position="sidebar" />
    </div>
  </div>;
}

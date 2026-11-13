'use client';

import { createContext, Fragment, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { checkOfficeArchive } from '@/lib/archive-safety';

const Session = createContext({ reset: () => {}, notice: '', error: '' });
const recentKey = 'zipora.recent-tools';
const checkedInputs = new WeakSet<HTMLInputElement>();

export function recentTools() {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(recentKey) ?? '[]');
    return Array.isArray(stored) ? stored.filter((value): value is string => typeof value === 'string').slice(0, 3) : [];
  } catch { return []; }
}

async function signature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const ascii = new TextDecoder('latin1').decode(bytes);
  if (bytes[0] === 77 && bytes[1] === 90) return '';
  if (ascii.slice(0, 1024).includes('%PDF-')) return 'pdf';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if ([137,80,78,71,13,10,26,10].every((byte, index) => bytes[index] === byte)) return 'png';
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return 'webp';
  if (ascii.slice(4, 8) === 'ftyp') {
    const { hasHeicHeader } = await import('@/lib/heic-conversion');
    if (await hasHeicHeader(file)) return 'heic';
    return 'video';
  }
  if (ascii.startsWith('\x1aE\xdf\xa3')) return 'video';
  if (bytes[0] === 80 && bytes[1] === 75 && bytes[2] === 3 && bytes[3] === 4) return 'office-zip';
  if ([208,207,17,224,161,177,26,225].every((byte, index) => bytes[index] === byte)) return 'office-legacy';
  return '';
}

function allowedTypes(accept: string) {
  return [
    [/pdf/, 'pdf'], [/jpe?g/, 'jpg'], [/png/, 'png'], [/webp/, 'webp'], [/hei[cf]/, 'heic'],
    [/docx|xlsx/, 'office-zip'], [/\.doc,|\.xls,|,\.doc$|,\.xls$/, 'office-legacy'],
    [/video\//, 'video'],
  ].filter(([pattern]) => (pattern as RegExp).test(accept)).map(([, type]) => String(type));
}

export function ToolSession({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [version, setVersion] = useState(0);
  const [message, setMessage] = useState({ notice: '', error: '' });
  const revision = useRef(0);
  function reset() {
    revision.current++;
    setMessage({ notice: '', error: '' });
    setVersion(value => value + 1);
  }

  useEffect(() => {
    revision.current++;
    setMessage({ notice: '', error: '' });
    let highlighted: HTMLElement | null = null;
    function clearHighlight() {
      highlighted?.removeAttribute('data-file-drag');
      highlighted = null;
    }
    function drag(event: DragEvent) {
      if (!event.dataTransfer?.types.includes('Files')) return;
      const zone = event.target instanceof Element ? event.target.closest<HTMLElement>('.drop-zone') : null;
      if (zone) { event.preventDefault(); event.stopImmediatePropagation(); }
      if (zone === highlighted) return;
      clearHighlight();
      if (zone?.querySelector('input[type="file"]:enabled')) {
        highlighted = zone;
        zone.dataset.fileDrag = 'true';
      }
    }
    function leave(event: DragEvent) {
      if (highlighted && (!(event.relatedTarget instanceof Node) || !highlighted.contains(event.relatedTarget))) clearHighlight();
    }
    async function validate(input: HTMLInputElement, files: File[]) {
      const ticket = ++revision.current;
      setMessage({ notice: '', error: '' });
      const allowed = allowedTypes(input.accept);
      try {
        for (const file of files) {
          // Merge validates each file itself and preserves valid files in a mixed batch.
          if (input.id === 'pdf-upload') continue;
          const type = await signature(file);
          if (!file.size || !allowed.includes(type)) {
            throw new Error(allowed.length === 1 && allowed[0] === 'pdf'
              ? 'This file is not a valid PDF, please upload a PDF file.'
              : 'This file is not a supported format. Choose a file listed in the upload area.');
          }
          if (type === 'office-zip') await checkOfficeArchive(file);
        }
        if (ticket !== revision.current || !input.isConnected || input.disabled) return;
        const threshold = allowed.includes('pdf') ? 200 : 100;
        if (files.some(file => file.size > threshold * 1024 * 1024)) {
          setMessage({ notice: `This file is over ${threshold} MB, it may be slow on a phone.`, error: '' });
        }
        const transfer = new DataTransfer();
        for (const file of files) transfer.items.add(file);
        input.files = transfer.files;
        checkedInputs.add(input);
        input.dispatchEvent(new Event('change', { bubbles: true }));
        checkedInputs.delete(input);
      } catch (error) {
        if (ticket === revision.current) setMessage({ notice: '', error: error instanceof Error ? error.message : 'Could not read this file.' });
      }
    }
    function change(event: Event) {
      const input = event.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.closest('.tool-panel') ||
          checkedInputs.has(input) || !input.files?.length) return;
      const files = Array.from(input.files);
      event.stopImmediatePropagation();
      input.value = '';
      void validate(input, files);
    }
    function drop(event: DragEvent) {
      clearHighlight();
      if (!event.dataTransfer?.files.length) return;
      const zone = event.target instanceof Element ? event.target.closest('.drop-zone') : null;
      const input = zone?.querySelector<HTMLInputElement>('input[type="file"]');
      if (!input) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!input.disabled) {
        record(event);
        void validate(input, Array.from(event.dataTransfer.files));
      }
    }
    function record(event: Event) {
      const tool = document.querySelector<HTMLElement>('[data-zipora-tool]')?.dataset.ziporaTool;
      if (!tool || !(event.target instanceof Element) || !event.target.closest('.tool-panel, .workspace')) return;
      if (event.type === 'click' && !event.target.closest('button, a[download]')) return;
      try { localStorage.setItem(recentKey, JSON.stringify([tool, ...recentTools().filter(item => item !== tool)].slice(0, 3))); }
      catch { /* Storage may be unavailable. */ }
    }
    document.addEventListener('dragover', drag, true);
    document.addEventListener('dragleave', leave, true);
    document.addEventListener('drop', drop, true);
    document.addEventListener('change', change, true);
    for (const name of ['click', 'input', 'change']) document.addEventListener(name, record, true);
    return () => {
      revision.current++;
      clearHighlight();
      document.removeEventListener('dragover', drag, true);
      document.removeEventListener('dragleave', leave, true);
      document.removeEventListener('drop', drop, true);
      document.removeEventListener('change', change, true);
      for (const name of ['click', 'input', 'change']) document.removeEventListener(name, record, true);
    };
  }, [pathname]);

  return <Session.Provider value={{ reset, ...message }}><Fragment key={version}>{children}</Fragment></Session.Provider>;
}

export function ToolControls({ slug, name }: { slug: string; name: string }) {
  const { reset, notice, error } = useContext(Session);
  return <div data-zipora-tool={slug} className="tool-session-controls">
    <span>Processed in your browser — not uploaded.</span>
    <button type="button" className="secondary-action" onClick={reset}>Clear tool</button>
    <a className="text-link" href={`mailto:contact@zipora.online?subject=${encodeURIComponent('Zipora problem — ' + name)}`}>Report a problem</a>
    {notice && <p role="status">{notice}</p>}
    {error && <p role="alert" className="error-message">{error}</p>}
  </div>;
}

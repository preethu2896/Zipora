import { checkArchiveLimits, safeDownloadName } from '@/lib/archive-safety';
import { PDFDocument } from 'pdf-lib';
import { loadPdf, MAX_TOTAL_BYTES, type PdfSource } from './pdf';

export const MAX_SPLIT_FILES = 200;
export const MAX_SPLIT_PAGES = 10_000;
export type SplitOptions =
  | { mode: 'ranges'; rangeMode: 'custom' | 'fixed'; ranges: string; every: number; combine: boolean }
  | { mode: 'pages'; selection: 'all' | 'selected'; pages: string; combine: boolean }
  | { mode: 'size'; maxBytes: number };
export type SplitPart = { bytes: Uint8Array; pages: number[] };

function checkCount(total: number) {
  if (!Number.isSafeInteger(total) || total < 1 || total > MAX_SPLIT_PAGES) throw new Error('Use a PDF with 1 to 10,000 pages.');
}
function rangesFromText(text: string, total: number): number[][] {
  checkCount(total);
  if (!text.trim()) throw new Error('Enter a page or range, such as 1-3, 5, 7-9.');
  if (text.length > 4000) throw new Error('The page selection is too long. Use shorter ranges.');
  const groups = text.split(',');
  if (groups.length > MAX_SPLIT_FILES) throw new Error('Use 200 ranges or fewer.');
  let emitted = 0;
  return groups.map(group => {
    const match = group.trim().match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!match) throw new Error(`Invalid range “${group.trim()}”. Use page numbers and commas, for example 1-3, 5.`);
    const first = Number(match[1]), last = Number(match[2] || match[1]);
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first < 1 || last > total || last < first) throw new Error(`Range “${group.trim()}” must go forward between pages 1 and ${total}.`);
    emitted += last - first + 1;
    if (emitted > MAX_SPLIT_PAGES) throw new Error('Select at most 10,000 pages including repeated ranges.');
    return Array.from({ length: last - first + 1 }, (_, index) => first + index);
  });
}
export function parsePageSelection(text: string, total: number) {
  return [...new Set(rangesFromText(text, total).flat())];
}
export function planSplit(total: number, options: Exclude<SplitOptions, { mode: 'size' }>): number[][] {
  checkCount(total);
  let groups: number[][];
  if (options.mode === 'pages') {
    const selected = options.selection === 'all' ? Array.from({ length: total }, (_, index) => index + 1) : parsePageSelection(options.pages, total);
    groups = options.combine ? [selected] : selected.map(page => [page]);
  } else if (options.rangeMode === 'custom') {
    const ranges = rangesFromText(options.ranges, total);
    groups = options.combine ? [ranges.flat()] : ranges;
  } else {
    if (!Number.isSafeInteger(options.every) || options.every < 1 || options.every > total) throw new Error(`Pages per file must be a whole number between 1 and ${total}.`);
    groups = [];
    for (let first = 1; first <= total; first += options.every) groups.push(Array.from({ length: Math.min(options.every, total - first + 1) }, (_, index) => first + index));
  }
  if (groups.length > MAX_SPLIT_FILES) throw new Error('This selection creates more than 200 files. Increase pages per file or combine the selected pages.');
  return groups;
}

async function copyGroup(source: PDFDocument, pages: number[], signal?: AbortSignal) {
  signal?.throwIfAborted();
  const output = await PDFDocument.create();
  const copied = await output.copyPages(source, pages.map(page => page - 1));
  copied.forEach(page => output.addPage(page));
  const bytes = await output.save();
  await new Promise(resolve => setTimeout(resolve, 0));
  signal?.throwIfAborted();
  return { bytes, pages };
}
export async function splitPdf(source: PdfSource, options: SplitOptions, progress = (_percent: number) => {}, signal?: AbortSignal): Promise<SplitPart[]> {
  const input = await source.arrayBuffer();
  if (input.byteLength > MAX_TOTAL_BYTES) throw new Error('Use a PDF under the 200 MB input budget.');
  const document = await loadPdf({ name: source.name, arrayBuffer: async () => input });
  const total = document.getPageCount();
  checkCount(total);
  const results: SplitPart[] = [];
  let outputSize = 0;
  function accept(part: SplitPart) {
    outputSize += part.bytes.length;
    if (outputSize > MAX_TOTAL_BYTES) throw new Error('The output exceeds 200 MB. Split fewer pages in one batch.');
    if (results.length >= MAX_SPLIT_FILES) throw new Error('This creates more than 200 PDFs. Choose larger parts or fewer pages.');
    results.push(part);
  }
  if (options.mode === 'size') {
    if (!Number.isFinite(options.maxBytes) || options.maxBytes < 1024 || options.maxBytes > MAX_TOTAL_BYTES) throw new Error('Choose a maximum size between 1 KB and 200 MB.');
    let start = 1;
    while (start <= total) {
      let best = await copyGroup(document, [start], signal);
      if (best.bytes.length > options.maxBytes) throw new Error(`Page ${start} alone is larger than the size limit. Increase the limit or compress the original PDF first.`);
      let low = start + 1, high = total;
      while (low <= high) {
        const end = Math.floor((low + high) / 2);
        const candidate = await copyGroup(document, Array.from({ length: end - start + 1 }, (_, index) => start + index), signal);
        if (candidate.bytes.length <= options.maxBytes) { best = candidate; low = end + 1; } else high = end - 1;
      }
      accept(best);
      start = best.pages.at(-1)! + 1;
      progress(Math.round(((start - 1) / total) * 100));
    }
  } else {
    const groups = planSplit(total, options);
    for (let index = 0; index < groups.length; index++) {
      accept(await copyGroup(document, groups[index], signal));
      progress(Math.round(((index + 1) / groups.length) * 100));
    }
  }
  return results;
}
export async function zipSplitParts(parts: SplitPart[], names: string[]) {
  const { default: JSZip } = await import('jszip');
  checkArchiveLimits(parts.length, parts.reduce((total, part) => total + part.bytes.length, 0));
  const zip = new JSZip();
  parts.forEach((part, index) => zip.file(safeDownloadName(names[index]), part.bytes));
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}

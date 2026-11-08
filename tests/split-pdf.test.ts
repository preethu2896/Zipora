import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { parsePageSelection, planSplit, splitPdf, zipSplitParts } from '../src/lib/split-pdf';

async function fixture(noisy = false) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  let seed = 51;
  for (let index = 0; index < 5; index++) {
    const page = document.addPage([300 + index * 10, 500]);
    let text = `Page ${index + 1}`;
    if (noisy) text = Array.from({ length: 4000 }, () => { seed = (seed * 16807) % 2147483647; return String.fromCharCode(65 + seed % 26); }).join('');
    page.drawText(text, { font, size: 12, x: 20, y: 400 });
  }
  const bytes = await document.save();
  return { name: 'five-pages.pdf', arrayBuffer: async () => new Uint8Array(bytes).buffer };
}
test('custom ranges preserve entered order, overlap, and actual page identity', async () => {
  const parts = await splitPdf(await fixture(), { mode: 'ranges', rangeMode: 'custom', ranges: '4-5, 1-2, 2', every: 1, combine: false });
  assert.deepEqual(parts.map(part => part.pages), [[4, 5], [1, 2], [2]]);
  assert.deepEqual((await PDFDocument.load(parts[0].bytes)).getPages().map(page => page.getWidth()), [330, 340]);
  const combined = await splitPdf(await fixture(), { mode: 'ranges', rangeMode: 'custom', ranges: '4-5, 1-2, 2', every: 1, combine: true });
  assert.deepEqual((await PDFDocument.load(combined[0].bytes)).getPages().map(page => page.getWidth()), [330, 340, 300, 310, 310]);
});
test('fixed groups keep the final remainder and extraction deduplicates without reordering', () => {
  assert.deepEqual(planSplit(5, { mode: 'ranges', rangeMode: 'fixed', ranges: '', every: 2, combine: false }), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(parsePageSelection('5, 1-3, 2, 5', 5), [5, 1, 2, 3]);
  assert.deepEqual(planSplit(5, { mode: 'pages', selection: 'selected', pages: '5, 1-2', combine: true }), [[5, 1, 2]]);
});
test('invalid, reversed, fractional, empty, and out-of-bounds selections are rejected', () => {
  for (const text of ['', '0', '2-1', '1.5', '6', '1,,2', '1-*', '2-9']) assert.throws(() => parsePageSelection(text, 5));
  assert.throws(() => planSplit(5, { mode: 'ranges', rangeMode: 'fixed', ranges: '', every: 0, combine: false }));
  assert.throws(() => planSplit(201, { mode: 'pages', selection: 'all', pages: '', combine: false }), /more than 200/);
});
test('size splitting checks actual bytes and covers every page once', async () => {
  const source = await fixture(true);
  const singles = await splitPdf(source, { mode: 'pages', selection: 'all', pages: '', combine: false });
  const limit = Math.max(...singles.map(part => part.bytes.length)) + 32;
  const parts = await splitPdf(source, { mode: 'size', maxBytes: limit });
  assert.ok(parts.length > 1);
  assert.ok(parts.every(part => part.bytes.length <= limit));
  assert.deepEqual(parts.flatMap(part => part.pages), [1, 2, 3, 4, 5]);
  await assert.rejects(splitPdf(source, { mode: 'size', maxBytes: 1024 }), /Page 1 alone/);
});
test('ZIP contains valid individual PDFs with their intended page counts', async () => {
  const parts = await splitPdf(await fixture(), { mode: 'ranges', rangeMode: 'fixed', ranges: '', every: 2, combine: false });
  const names = ['first.pdf', 'second.pdf', 'last.pdf'];
  const zip = await JSZip.loadAsync(await (await zipSplitParts(parts, names)).arrayBuffer());
  assert.deepEqual(Object.keys(zip.files), names);
  assert.equal((await PDFDocument.load(await zip.file('last.pdf')!.async('uint8array'))).getPageCount(), 1);
});
test('locked inputs and cancellation produce no partial result', async () => {
  const bytes = await readFile('tests/fixtures/locked.pdf');
  const options = { mode: 'pages', selection: 'all', pages: '', combine: false } as const;
  await assert.rejects(splitPdf({ name: 'locked.pdf', arrayBuffer: async () => new Uint8Array(bytes).buffer }, options), /password-protected/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(splitPdf(await fixture(), options, undefined, controller.signal), { name: 'AbortError' });
});

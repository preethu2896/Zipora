import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { inspectPdf, mergePdfs, outputFilename } from '../src/lib/pdf';

async function source(name: string, widths: number[]) {
  const doc = await PDFDocument.create();
  widths.forEach(width => doc.addPage([width, 600]));
  const bytes = await doc.save();
  return { name, arrayBuffer: async () => new Uint8Array(bytes).buffer };
}
test('merge preserves every page and the chosen document order', async () => {
  const first = await source('first.pdf', [301, 302]);
  const second = await source('second.pdf', [401]);
  const updates: number[] = [];
  const merged = await mergePdfs([second, first], value => updates.push(value));
  const document = await PDFDocument.load(merged.bytes);
  assert.equal(merged.pages, 3);
  assert.deepEqual(document.getPages().map(page => page.getWidth()), [401, 301, 302]);
  assert.equal(updates.at(-1), 100);
});
test('valid PDFs expose their actual page counts', async () => {
  assert.equal(await inspectPdf(await source('two.pdf', [320, 500])), 2);
});
test('zero or one input cannot be merged', async () => {
  await assert.rejects(mergePdfs([]), /at least two/);
  await assert.rejects(mergePdfs([await source('one.pdf', [300])]), /at least two/);
});
test('corrupt files produce actionable errors instead of a download', async () => {
  await assert.rejects(inspectPdf({ name: 'broken.pdf', arrayBuffer: async () => new TextEncoder().encode('bad file').buffer }), /broken.pdf.*could not be read/);
});
test('empty PDFs are rejected', async () => {
  const doc = await PDFDocument.create();
  const bytes = await doc.save({ addDefaultPage: false });
  await assert.rejects(inspectPdf({ name: 'empty.pdf', arrayBuffer: async () => new Uint8Array(bytes).buffer }), /could not be read/);
});
test('encrypted PDFs are rejected without ignoring encryption', async () => {
  const bytes = await readFile('tests/fixtures/locked.pdf');
  await assert.rejects(inspectPdf({ name: 'locked.pdf', arrayBuffer: async () => new Uint8Array(bytes).buffer }), /password-protected.*unlocked copy/);
});
test('output filenames keep one PDF extension and cannot contain path separators', () => {
  assert.equal(outputFilename(' report.pdf '), 'report.pdf');
  assert.equal(outputFilename(''), 'zipora-merged.pdf');
  assert.equal(outputFilename('../a:b'), '..-a-b.pdf');
});

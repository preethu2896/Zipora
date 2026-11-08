import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { imagesToPdf, inspectImage, optimizePdf } from '../src/lib/conversions';

async function source(path: string) {
  const bytes = await readFile(path);
  return { name: path.split('/').at(-1)!, arrayBuffer: async () => new Uint8Array(bytes).buffer };
}
test('image conversion preserves chosen order and exact original-size page dimensions', async () => {
  const red = await source('tests/fixtures/red.png');
  const blue = await source('tests/fixtures/blue.png');
  const result = await imagesToPdf([blue, red], { pageSize: 'original', margin: 24 });
  const document = await PDFDocument.load(result.bytes);
  assert.deepEqual(document.getPages().map(page => page.getSize()), [{ width: 20, height: 40 }, { width: 40, height: 20 }]);
});
test('A4 and Letter outputs use actual paper dimensions', async () => {
  const image = await source('tests/fixtures/red.png');
  for (const [pageSize, expected] of [['a4', [595.28, 841.89]], ['letter', [612, 792]]] as const) {
    const result = await imagesToPdf([image], { pageSize, margin: 48 });
    const page = (await PDFDocument.load(result.bytes)).getPage(0);
    assert.deepEqual([page.getWidth(), page.getHeight()], expected);
  }
});
test('image inspection checks bytes rather than trusting an extension', async () => {
  assert.deepEqual(await inspectImage(await source('tests/fixtures/red.png')), { width: 40, height: 20 });
  assert.deepEqual(await inspectImage(await source('tests/fixtures/red.jpg')), { width: 40, height: 20 });
  await assert.rejects(inspectImage({ name: 'fake.png', arrayBuffer: async () => new TextEncoder().encode('not an image').buffer }), /could not be read/);
});
test('empty image queues are rejected', async () => {
  await assert.rejects(imagesToPdf([], { pageSize: 'a4', margin: 0 }), /at least one/);
});
test('structural compression produces real savings and preserves page sizes', async () => {
  const original = await PDFDocument.create();
  original.addPage([330, 660]); original.addPage([660, 330]);
  original.setTitle('Unnecessary descriptive metadata '.repeat(1000));
  const bytes = await original.save({ useObjectStreams: false });
  const result = await optimizePdf({ name: 'large-metadata.pdf', arrayBuffer: async () => new Uint8Array(bytes).buffer });
  assert.ok(result.bytes.length < bytes.length);
  assert.ok(result.savedPercent > 0);
  assert.equal(result.pages, 2);
  assert.deepEqual((await PDFDocument.load(result.bytes)).getPages().map(page => page.getSize()), [{ width: 330, height: 660 }, { width: 660, height: 330 }]);
});
test('structural compression never returns a larger file and rejects locked PDFs', async () => {
  const doc = await PDFDocument.create(); doc.addPage();
  const bytes = await doc.save();
  const result = await optimizePdf({ name: 'small.pdf', arrayBuffer: async () => new Uint8Array(bytes).buffer });
  assert.ok(result.bytes.length <= bytes.length);
  assert.ok(result.savedPercent >= 0);
  await assert.rejects(optimizePdf(await source('tests/fixtures/locked.pdf')), /password-protected/);
});

test('structural optimization removes unused PDF objects without rasterizing pages', async () => {
  const document = await PDFDocument.create(); document.addPage([300, 400]);
  let seed = 7;
  const unused = Uint8Array.from({ length: 40_000 }, () => { seed = seed * 16807 % 2147483647; return seed % 256; });
  document.context.register(document.context.flateStream(unused));
  const bytes = await document.save();
  const result = await optimizePdf({ name: 'edited.pdf', arrayBuffer: async () => new Uint8Array(bytes).buffer });
  assert.ok(result.bytes.length < bytes.length / 2);
  assert.equal(result.strategy, 'optimized');
  assert.equal((await PDFDocument.load(result.bytes)).getPageCount(), 1);
});

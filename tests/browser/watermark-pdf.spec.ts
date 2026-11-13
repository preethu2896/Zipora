import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { decodePDFRawStream, degrees, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib';
import { monitorFileRequests } from './file-requests';

async function downloadPdf(page: Page) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('sample-watermarked.pdf');
  return PDFDocument.load(await readFile((await download.path())!));
}

function streams(document: PDFDocument, index: number) {
  const contents = document.getPage(index).node.Contents();
  const items = contents instanceof PDFArray ? contents.asArray() : [contents];
  return items.map(item => {
    const stream = document.context.lookup(item);
    if (!(stream instanceof PDFRawStream)) throw new Error('Expected a PDF content stream.');
    return Buffer.from(decodePDFRawStream(stream).decode()).toString('ascii');
  });
}

test('Watermark PDF previews and downloads text and image stamps locally', async ({ page }) => {
  const requests = monitorFileRequests(page);
  await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?*', route => route.abort());
  const fixture = await PDFDocument.create();
  fixture.addPage([300, 500]).drawText('Cover');
  const second = fixture.addPage([300, 500]);
  second.drawText('Original page');
  second.setRotation(degrees(90));
  const bytes = Buffer.from(await fixture.save());

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/watermark-pdf/');
  await expect(page.getByRole('button', { name: 'Select PDF' })).toBeEnabled();
  await page.getByLabel('Choose PDF').setInputFiles({ name: 'sample.pdf', mimeType: 'application/pdf', buffer: bytes });
  await page.getByLabel('Watermark text').fill('DRAFT');
  await page.getByLabel('From page').fill('2');
  await page.getByRole('button', { name: 'Preview watermark' }).click();
  const proof = page.getByRole('img', { name: 'Watermarked preview of page 2' });
  await expect(proof).toBeVisible({ timeout: 15000 });
  expect(await proof.evaluate(async (image: HTMLImageElement) => {
    await image.decode();
    return image.naturalWidth > image.naturalHeight;
  })).toBe(true);
  await page.getByRole('button', { name: 'Add watermark', exact: true }).click();
  const text = await downloadPdf(page);
  expect(text.getPageCount()).toBe(2);
  expect(text.getPage(1).getRotation().angle).toBe(90);
  expect(streams(text, 0).join('')).not.toContain('<4452414654>');
  expect(streams(text, 1).join('')).toContain('<4452414654>');
  expect(streams(text, 1).join('')).toContain('<4F726967696E616C2070616765>');

  await page.getByLabel('Watermark type').selectOption('image');
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
  await page.getByLabel('Watermark image (PNG or JPEG)').setInputFiles('tests/fixtures/red.png');
  await page.getByLabel('Layer').selectOption('under');
  await page.getByRole('checkbox', { name: 'Repeat across the page' }).check();
  await page.getByRole('button', { name: 'Add watermark', exact: true }).click();
  const image = await downloadPdf(page);
  expect(streams(image, 1)[0].match(/ Do\b/g)).toHaveLength(9);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});

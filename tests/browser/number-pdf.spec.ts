import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { decodePDFRawStream, degrees, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib';
import { monitorFileRequests } from './file-requests';

function pageOperators(document: PDFDocument, index: number) {
  const contents = document.getPage(index).node.Contents();
  const items = contents instanceof PDFArray ? contents.asArray() : [contents];
  return items.map(item => {
    const stream = document.context.lookup(item);
    if (!(stream instanceof PDFRawStream)) throw new Error('Expected a PDF content stream.');
    return Buffer.from(decodePDFRawStream(stream).decode()).toString('ascii');
  }).join('\n');
}

test('adds printable page numbers to a selected range with a skipped cover and facing placement', async ({ page }) => {
  const requests = monitorFileRequests(page);
  await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?*', route => route.abort());
  const fixture = await PDFDocument.create();
  for (const label of ['Cover', 'Body', 'Appendix', 'Back']) fixture.addPage([300, 500]).drawText(label);
  fixture.getPage(2).setRotation(degrees(90));
  const bytes = Buffer.from(await fixture.save());

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/add-page-numbers-to-pdf/');
  await expect(page.getByRole('button', { name: 'Select PDF' })).toBeEnabled();
  await page.getByLabel('Choose PDF').setInputFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: bytes });
  await page.getByLabel('To page').fill('3');
  await page.getByLabel('First number').fill('7');
  await page.getByLabel('Position').selectOption({ label: 'Bottom right' });
  await page.getByLabel('Skip the cover page').check();
  await page.getByLabel('Mirror even pages').check();
  await page.getByLabel('Number format').selectOption('custom');
  await page.getByLabel('Custom format').fill('Section {n}/{rf}');
  await page.getByRole('button', { name: 'Preview numbers' }).click();
  await expect(page.getByRole('img', { name: 'Numbered preview of PDF page 2' })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Add page numbers' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('report-numbered.pdf');
  const output = await PDFDocument.load(await readFile((await download.path())!));
  expect(output.getPageCount()).toBe(4);
  expect(output.getPage(2).getRotation().angle).toBe(90);
  const operators = [0, 1, 2, 3].map(index => pageOperators(output, index));
  const encoded = (text: string) => '<' + Buffer.from(text).toString('hex').toUpperCase() + '>';
  expect(operators[0]).not.toContain(encoded('Section 7/8'));
  expect(operators[1]).toContain(encoded('Section 7/8'));
  expect(operators[1]).toContain(encoded('Body'));
  expect(operators[1]).toMatch(/1 0 0 1 24 [\d.]+ Tm/);
  expect(operators[2]).toContain(encoded('Section 8/8'));
  expect(operators[3]).not.toContain(encoded('Section 9/8'));
  await page.getByLabel('First number').fill('9');
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});

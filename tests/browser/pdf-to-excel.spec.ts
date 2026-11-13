import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { monitorFileRequests } from './file-requests';

test('PDF to Excel downloads numeric and text cells in editable worksheets', async ({ page }, testInfo) => {
  const requests = monitorFileRequests(page);
  const source = await PDFDocument.create();
  const first = source.addPage();
  for (const [label, value, y] of [['Item', 'Total', 700], ['Pencils', '125.50', 674], ['Pens', '7', 648]] as const) {
    first.drawText(label, { x: 72, y, size: 12 });
    first.drawText(value, { x: 250, y, size: 12 });
  }
  source.addPage();
  source.addPage().drawText('=1+1', { x: 72, y: 700 });
  const blank = await PDFDocument.create();
  const image = await blank.embedPng('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==');
  blank.addPage().drawImage(image, { x: 50, y: 50, width: 300, height: 400 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pdf-to-excel/');
  await expect(page.getByRole('button', { name: 'Select PDF' })).toBeEnabled();
  const picker = page.getByLabel('Choose PDF', { exact: true });
  const convert = page.getByRole('button', { name: 'Convert to Excel', exact: true });
  const error = page.getByRole('region', { name: 'PDF to Excel workspace' }).getByRole('alert');

  await picker.setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await blank.save()) });
  await convert.click();
  await expect(error).toContainText('Scanned pages need OCR', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Download XLSX' })).toHaveCount(0);
  await picker.setInputFiles({ name: 'report.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await source.save()) });
  await convert.click();
  await expect(page.getByRole('heading', { name: 'Your workbook is ready' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Pages without selectable text were skipped.', { exact: false })).toBeVisible();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download XLSX' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('report.xlsx');
  const output = testInfo.outputPath('report.xlsx');
  await download.saveAs(output);
  const workbook = await JSZip.loadAsync(await readFile(output));
  const index = await workbook.file('xl/workbook.xml')!.async('string');
  expect(index).toContain('name="PDF data"');
  const rows = await workbook.file('xl/worksheets/sheet1.xml')!.async('string');
  expect(rows).toContain('<c r="A2" t="inlineStr"><is><t xml:space="preserve">Pencils</t>');
  expect(rows).toContain('<c r="B2"><v>125.50</v>');
  expect(rows).toContain('<c r="B3"><v>7</v>');
  const third = rows;
  expect(rows).toContain('<c r="A4"');
  expect(third).toContain('>=1+1</t>');
  expect(third).not.toContain('<f>');
  const twoPages = await PDFDocument.create();
  const repro = [
    ['Zipora Text PDF - Page 1', 'Hello Zipora', 'Name Age City', 'Asha 22 Bengaluru', 'Ravi 24 Mangaluru'],
    ['Zipora Text PDF - Page 2', 'Second page of selectable text', 'Meera 21 Udupi'],
  ];
  for (const lines of repro) {
    const sheet = twoPages.addPage();
    lines.forEach((line, index) => sheet.drawText(line, { x: 72, y: 700 - index * 24, size: 12 }));
  }
  await picker.setInputFiles({ name: 'two-pages.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await twoPages.save()) });
  await convert.click();
  const next = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download XLSX' }).click();
  const twoPageWorkbook = await JSZip.loadAsync(await readFile((await (await next).path())!));
  const combined = await twoPageWorkbook.file('xl/worksheets/sheet1.xml')!.async('string');
  let previous = -1;
  for (const line of repro.flat()) {
    const position = combined.indexOf(line);
    expect(position, line).toBeGreaterThan(previous);
    previous = position;
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});

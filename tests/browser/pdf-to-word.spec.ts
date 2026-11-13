import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { monitorFileRequests } from './file-requests';

test('PDF to Word explains scans and downloads editable DOCX text', async ({ page }, testInfo) => {
  const requests = monitorFileRequests(page);
  const source = await PDFDocument.create();
  source.addPage().drawText('Zipora editable PDF text', { x: 72, y: 700 });
  source.addPage().drawText('Another page to edit', { x: 72, y: 700 });
  const scan = await PDFDocument.create();
  const pixel = await scan.embedPng('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGNgAAAAAgABSK+kcQAAAABJRU5ErkJggg==');
  scan.addPage().drawImage(pixel, { x: 72, y: 72, width: 300, height: 400 });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pdf-to-word/');
  await expect(page.getByRole('button', { name: 'Select PDF' })).toBeEnabled();
  const picker = page.getByLabel('Choose PDF', { exact: true });
  const convert = page.getByRole('button', { name: 'Convert to Word', exact: true });
  const workspace = page.getByRole('region', { name: 'PDF to Word workspace' });

  await picker.setInputFiles({ name: 'invalid.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a PDF') });
  await expect(page.locator('.tool-session-controls [role=alert]')).toHaveText('This file is not a valid PDF, please upload a PDF file.');
  await picker.setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await scan.save()) });
  await convert.click();
  await expect(workspace.getByRole('alert')).toContainText('Scanned pages need OCR', { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Download DOCX' })).toHaveCount(0);

  await picker.setInputFiles({ name: 'sample.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await source.save()) });
  await convert.click();
  await expect(page.getByRole('heading', { name: 'Your Word document is ready' })).toBeVisible({ timeout: 15_000 });
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download DOCX' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('sample.docx');
  const output = testInfo.outputPath('sample.docx');
  await download.saveAs(output);
  const docx = await JSZip.loadAsync(await readFile(output));
  const xml = await docx.file('word/document.xml')?.async('string');
  expect(xml).toContain('>Zipora editable PDF text</w:t>');
  expect(xml).toContain('>Another page to edit</w:t>');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});

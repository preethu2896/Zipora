import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { degrees, PDFDocument } from 'pdf-lib';
import { monitorFileRequests } from './file-requests';

test('Rotate PDF previews and saves individual and whole-document turns locally', async ({ page }) => {
  const requests = monitorFileRequests(page);
  const fixture = await PDFDocument.create();
  fixture.addPage([300, 500]).drawText('First page');
  fixture.addPage([400, 600]).setRotation(degrees(90));
  const bytes = Buffer.from(await fixture.save());

  // Keep the upload assertion independent of AdSense's own delivery beacons.
  await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?*', route => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/rotate-pdf/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rotate PDF Online Free');
  await expect(page.getByRole('button', { name: 'Select PDF' })).toBeEnabled();
  await page.getByLabel('Choose PDF').setInputFiles({ name: 'invalid.pdf', mimeType: 'application/pdf', buffer: Buffer.from('invalid') });
  await expect(page.getByRole('region', { name: 'Rotate PDF workspace' }).getByRole('alert')).toContainText('could not be read');
  await page.getByLabel('Choose PDF').setInputFiles({ name: 'sample.pdf', mimeType: 'application/pdf', buffer: bytes });
  const preview = page.getByRole('img', { name: 'Preview of page 1' });
  await expect(preview).toBeVisible();
  await page.getByRole('button', { name: 'Rotate left' }).click();
  await expect(page.getByText('Page 1 of 2 · 270° added')).toBeVisible();
  await expect(preview).toBeVisible();
  expect(await preview.evaluate(async (image: HTMLImageElement) => {
    await image.decode();
    return image.naturalWidth > image.naturalHeight;
  })).toBe(true);
  await page.getByRole('button', { name: 'Reset rotations' }).click();
  await expect(page.getByRole('button', { name: 'Save rotated PDF' })).toBeDisabled();
  await page.getByRole('button', { name: 'Rotate left' }).click();
  await page.getByRole('button', { name: 'Next page' }).click();
  await page.getByRole('checkbox', { name: 'Rotate all pages' }).check();
  await page.getByRole('button', { name: 'Rotate right' }).click();
  await expect(page.getByText('Page 2 of 2 · 90° added')).toBeVisible();
  await page.getByRole('button', { name: 'Save rotated PDF' }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('sample-rotated.pdf');
  const output = await PDFDocument.load(await readFile((await download.path())!));
  expect(output.getPages().map(pdfPage => [pdfPage.getWidth(), pdfPage.getRotation().angle])).toEqual([[300, 0], [400, 180]]);
  await page.getByRole('button', { name: 'Rotate right' }).click();
  await expect(page.getByRole('button', { name: 'Download PDF' })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});

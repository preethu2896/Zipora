import { test, expect, type Page } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

async function upload(page: Page, noisy = false) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  let seed = 55;
  for (let index = 0; index < 5; index++) {
    const p = document.addPage([300 + index * 10, 500]);
    const text = noisy ? Array.from({ length: 4000 }, () => { seed = seed * 16807 % 2147483647; return String.fromCharCode(65 + seed % 26); }).join('') : `Page ${index + 1}`;
    p.drawText(text, { font, size: 12, x: 20, y: 400 });
  }
  await page.goto('/split-pdf/');
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Select PDF', exact: true }).click();
  await (await chooser).setFiles({ name: 'five-pages.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await document.save()) });
  await expect(page.locator('.split-source')).toContainText('5 pages');
}
async function download(page: Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const result = await pending;
  return { name: result.suggestedFilename(), bytes: await readFile((await result.path())!) };
}
test('custom splitting creates real ordered PDFs and a ZIP; settings remove stale results', async ({ page }) => {
  await upload(page);
  await page.getByLabel('Page ranges', { exact: true }).fill('1-2, 5');
  await page.getByLabel('Filename prefix').fill('report');
  await page.getByRole('button', { name: 'Split PDF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your PDFs are ready' })).toBeVisible();
  const part = await download(page, 'Download part 1');
  expect(part.name).toBe('report-part-001.pdf');
  expect((await PDFDocument.load(part.bytes)).getPages().map(p => p.getWidth())).toEqual([300, 310]);
  const zip = await JSZip.loadAsync((await download(page, 'Download all PDFs')).bytes);
  expect(Object.keys(zip.files)).toEqual(['report-part-001.pdf', 'report-part-002.pdf']);
  expect((await PDFDocument.load(await zip.file('report-part-002.pdf')!.async('uint8array'))).getPage(0).getWidth()).toBe(340);
  await page.getByLabel('Page ranges', { exact: true }).fill('0, 6');
  await expect(page.getByRole('button', { name: 'Download all PDFs' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Split PDF', exact: true })).toBeDisabled();
  await expect(page.locator('.selection-error')).toBeVisible();
});
test('fixed ranges and selected-page extraction keep intended page order', async ({ page }) => {
  await upload(page);
  await page.getByRole('combobox', { name: 'Range mode' }).selectOption('fixed');
  await page.getByLabel('Pages per file', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Split PDF', exact: true }).click();
  await expect(page.locator('.split-downloads li')).toHaveCount(3);
  expect((await PDFDocument.load((await download(page, 'Download part 3')).bytes)).getPageCount()).toBe(1);
  await page.getByRole('tab', { name: 'Extract pages' }).click();
  await page.getByRole('combobox', { name: 'Extract mode' }).selectOption('selected');
  await page.getByLabel('Pages to extract', { exact: true }).fill('5, 1-2');
  await page.getByLabel('Combine into one PDF', { exact: true }).check();
  await page.getByRole('button', { name: 'Split PDF', exact: true }).click();
  await expect(page.locator('.split-downloads li')).toHaveCount(1);
  expect((await PDFDocument.load((await download(page, 'Download part 1')).bytes)).getPages().map(p => p.getWidth())).toEqual([340, 300, 310]);
  await page.getByRole('button', { name: 'Toggle page 3', exact: true }).click();
  await expect(page.getByLabel('Pages to extract', { exact: true })).toHaveValue('1-3, 5');
  await expect(page.locator('.split-downloads li')).toHaveCount(0);
});
test('size mode respects limits and reports an oversized page honestly', async ({ page }) => {
  await upload(page, true);
  await page.getByRole('tab', { name: 'By size' }).click();
  await page.getByRole('combobox', { name: 'Size unit' }).selectOption('KB');
  await page.getByLabel('Maximum size', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Split PDF', exact: true }).click();
  await expect(page.locator('.error-message')).toContainText('Page 1 alone');
  await page.getByLabel('Maximum size', { exact: true }).fill('8');
  await page.getByRole('button', { name: 'Split PDF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your PDFs are ready' })).toBeVisible();
  expect((await download(page, 'Download part 1')).bytes.length).toBeLessThanOrEqual(8192);
});
test('split handles locked inputs, phone layout, and all-tool navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/split-pdf/');
  await expect(page.getByRole('button', { name: 'Select PDF', exact: true })).toBeEnabled({ timeout: 15000 });
  await page.getByLabel('Choose PDF to split', { exact: true }).setInputFiles('tests/fixtures/locked.pdf');
  await expect(page.locator('.error-message')).toContainText('password-protected');
  await upload(page);
  await page.getByRole('tab', { name: 'Extract pages' }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('.footer-tools a')).toHaveCount(39);
  await page.screenshot({ path: 'research/split-pdf-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('tab', { name: 'Ranges', exact: true }).click();
  await page.screenshot({ path: 'research/split-pdf-desktop.png', fullPage: true });
});

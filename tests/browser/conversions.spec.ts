import { test, expect, type Page } from '@playwright/test';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import JSZip from 'jszip';
import { readFile } from 'node:fs/promises';

async function pdfFixture(name = 'document.pdf', pages = 2) {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (let index = 0; index < pages; index++) {
    const page = document.addPage([300 + index * 20, 400]);
    page.drawRectangle({ x: 0, y: 0, width: page.getWidth(), height: 400, color: index === 0 ? rgb(.9, .1, .1) : rgb(.1, .1, .9) });
    page.drawText(`Zipora page ${index + 1}`, { x: 20, y: 300, font, size: 18 });
  }
  document.setTitle('Descriptive metadata '.repeat(2000));
  return { name, mimeType: 'application/pdf', buffer: Buffer.from(await document.save({ useObjectStreams: false })) };
}
async function choose(page: Page, route: string, fixture: Awaited<ReturnType<typeof pdfFixture>>) {
  await page.goto(route);
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Select PDF', exact: true }).click();
  await (await chooser).setFiles(fixture);
  await expect(page.locator('.file-row')).toHaveCount(1);
}
async function downloadBytes(page: Page, name: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name, exact: true }).click();
  const download = await pending;
  return { name: download.suggestedFilename(), bytes: await readFile((await download.path())!) };
}

test('JPG/PNG to PDF supports ordered pages, options, real download, and stale-result removal', async ({ page }) => {
  await page.goto('/jpg-to-pdf/');
  await expect(page.locator('.upload-button')).toBeEnabled();
  const chooser = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Select images', exact: true }).click();
  await (await chooser).setFiles(['tests/fixtures/red.jpg', 'tests/fixtures/blue.png']);
  await expect(page.locator('.file-row')).toHaveCount(2);
  await page.getByLabel('Move blue.png up').click();
  await page.getByRole('combobox', { name: 'Page size', exact: true }).selectOption('original');
  await page.getByLabel('Output filename').fill('photos');
  await page.getByRole('button', { name: 'Convert to PDF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your PDF is ready', exact: true })).toBeVisible();
  const output = await downloadBytes(page, 'Download PDF');
  expect(output.name).toBe('photos.pdf');
  const pdf = await PDFDocument.load(output.bytes);
  expect(pdf.getPages().map(p => [p.getWidth(), p.getHeight()])).toEqual([[20, 40], [40, 20]]);
  await page.getByRole('combobox', { name: 'Page size', exact: true }).selectOption('a4');
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toHaveCount(0);
  await page.getByLabel('Remove blue.png').click();
  await expect(page.locator('.file-row')).toHaveCount(1);
  await page.getByRole('button', { name: 'Clear all' }).click();
  await expect(page.getByRole('button', { name: 'Convert to PDF', exact: true })).toBeDisabled();
});

test('PDF optimization reports real savings and preserves actual pages', async ({ page }) => {
  const fixture = await pdfFixture();
  await choose(page, '/compress-pdf/', fixture);
  await expect(page.getByRole('combobox', { name: 'Compression method', exact: true })).toHaveValue('balanced');
  await page.getByRole('combobox', { name: 'Compression method', exact: true }).selectOption('optimize');
  await page.getByRole('button', { name: 'Compress PDF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your PDF is ready', exact: true })).toBeVisible();
  const output = await downloadBytes(page, 'Download PDF');
  expect(output.bytes.length).toBeLessThan(fixture.buffer.length);
  expect((await PDFDocument.load(output.bytes)).getPageCount()).toBe(2);
  await page.getByRole('combobox', { name: 'Compression method', exact: true }).selectOption('strong');
  await expect(page.getByRole('button', { name: 'Download PDF', exact: true })).toHaveCount(0);
  await expect(page.locator('.option-warning')).toContainText('smallest result');
  await page.getByRole('button', { name: 'Compress PDF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your PDF is ready', exact: true })).toBeVisible();
  const raster = await downloadBytes(page, 'Download PDF');
  const result = await PDFDocument.load(raster.bytes);
  expect(raster.bytes.length).toBeLessThanOrEqual(fixture.buffer.length);
  expect(result.getPageCount()).toBe(2);
  expect(result.getPage(0).getWidth()).toBe(300);
});

test('PDF pages render as genuine JPGs and a complete numbered ZIP with no uploads', async ({ page }) => {
  const uploads: string[] = [];
  const errors: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') uploads.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await choose(page, '/pdf-to-jpg/', await pdfFixture());
  await page.getByRole('combobox', { name: 'Resolution', exact: true }).selectOption('1');
  await page.getByRole('button', { name: 'Convert to JPG', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your JPGs are ready' })).toBeVisible();
  await expect(page.locator('.jpg-result')).toHaveCount(2);
  await expect(page.locator('[data-slot="download-button"]')).toHaveCount(3);
  const dimensions = await page.locator('.jpg-result img').first().evaluate((image: HTMLImageElement) => ({ width: image.naturalWidth, height: image.naturalHeight }));
  expect(dimensions).toEqual({ width: 300, height: 400 });
  const firstPixel = await page.locator('.jpg-result img').first().evaluate((image: HTMLImageElement) => { const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1; const ctx = canvas.getContext('2d')!; ctx.drawImage(image, 0, 0); return Array.from(ctx.getImageData(0, 0, 1, 1).data); });
  expect(firstPixel[0]).toBeGreaterThan(180); expect(firstPixel[2]).toBeLessThan(80);
  const zipped = await downloadBytes(page, 'Download all JPGs');
  const zip = await JSZip.loadAsync(zipped.bytes);
  expect(Object.keys(zip.files)).toEqual(['page-001.jpg', 'page-002.jpg']);
  const jpg = await zip.file('page-001.jpg')!.async('uint8array');
  expect(jpg[0]).toBe(0xff); expect(jpg[1]).toBe(0xd8);
  expect((await zip.file('page-002.jpg')!.async('uint8array'))[0]).toBe(0xff);
  await page.getByRole('combobox', { name: 'JPEG quality', exact: true }).selectOption('0.7');
  await expect(page.locator('.jpg-result')).toHaveCount(0);
  expect(uploads).toEqual([]); expect(errors).toEqual([]);
});

test('one-page PDF to JPG offers only one direct JPG download', async ({ page }) => {
  await choose(page, '/pdf-to-jpg/', await pdfFixture('cover.pdf', 1));
  await page.getByLabel('Output filename').fill('cover');
  await page.getByRole('button', { name: 'Convert to JPG', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your JPGs are ready' })).toBeVisible();
  await expect(page.locator('[data-slot="download-button"]')).toHaveCount(1);
  const output = await downloadBytes(page, 'Download JPG');
  expect(output.name).toBe('cover.jpg');
  expect(output.bytes[0]).toBe(0xff); expect(output.bytes[1]).toBe(0xd8);
});

test('all compression methods keep small text PDFs from growing and report actual savings', async ({ page }) => {
  const document = await PDFDocument.create();
  document.addPage([300, 400]).drawText('A small text document', { x: 20, y: 300, size: 16 });
  const bytes = Buffer.from(await document.save());
  await choose(page, '/compress-pdf/', { name: 'small.pdf', mimeType: 'application/pdf', buffer: bytes });
  for (const method of ['optimize', 'balanced', 'strong']) {
    await page.getByRole('combobox', { name: 'Compression method', exact: true }).selectOption(method);
    await page.getByRole('button', { name: 'Compress PDF', exact: true }).click();
    await expect(page.locator('.conversion-result')).toBeVisible();
    const button = page.locator('.conversion-result [data-slot="download-button"]');
    const pending = page.waitForEvent('download');
    await button.click();
    const downloaded = await pending;
    const output = await readFile((await downloaded.path())!);
    expect(output.length).toBeLessThanOrEqual(bytes.length);
    expect((await PDFDocument.load(output)).getPageCount()).toBe(1);
    await expect(page.locator('.size-comparison')).not.toContainText('Larger by');
  }
});

test('image-heavy PDF compression makes a genuinely smaller PDF', async ({ page }) => {
  await page.goto('/compress-pdf/');
  await expect(page.locator('.upload-button')).toBeEnabled({ timeout: 15000 });
  const dataUrl = await page.evaluate(() => {
    const canvas = window.document.createElement('canvas'); canvas.width = 1000; canvas.height = 1200;
    const context = canvas.getContext('2d')!; const pixels = context.createImageData(1000, 1200);
    let seed = 19;
    for (let offset = 0; offset < pixels.data.length; offset += 4) { seed = seed * 16807 % 2147483647; pixels.data[offset] = seed % 256; pixels.data[offset + 1] = seed % 127; pixels.data[offset + 2] = seed % 73; pixels.data[offset + 3] = 255; }
    context.putImageData(pixels, 0, 0); return canvas.toDataURL('image/jpeg', .98);
  });
  const document = await PDFDocument.create();
  const image = await document.embedJpg(Buffer.from(dataUrl.split(',')[1], 'base64'));
  document.addPage([500, 600]).drawImage(image, { x: 0, y: 0, width: 500, height: 600 });
  const original = Buffer.from(await document.save());
  await page.getByLabel('Choose PDF', { exact: true }).setInputFiles({ name: 'scan.pdf', mimeType: 'application/pdf', buffer: original });
  await expect(page.locator('.file-row')).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Compression method', exact: true }).selectOption('strong');
  await page.getByRole('button', { name: 'Compress PDF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your PDF is ready', exact: true })).toBeVisible({ timeout: 15000 });
  const output = await downloadBytes(page, 'Download PDF');
  expect(output.bytes.length).toBeLessThan(original.length);
  expect((await PDFDocument.load(output.bytes)).getPage(0).getSize()).toEqual({ width: 500, height: 600 });
});

test('new tools reject damaged, unsupported, and locked files', async ({ page }) => {
  for (const route of ['/compress-pdf/', '/pdf-to-jpg/']) {
    await page.goto(route);
    await expect(page.locator('.upload-button')).toBeEnabled();
    await page.getByLabel('Choose PDF', { exact: true }).setInputFiles('tests/fixtures/locked.pdf');
    await expect(page.locator('.error-message')).toContainText('password-protected');
    await page.getByLabel('Choose PDF', { exact: true }).setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('bad') });
    await expect(page.locator('.error-message')).toContainText('could not be read');
  }
  await page.goto('/jpg-to-pdf/');
  await expect(page.locator('.upload-button')).toBeEnabled();
  await page.getByLabel('Choose images', { exact: true }).setInputFiles({ name: 'broken.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('bad') });
  await expect(page.locator('.error-message')).toContainText('could not be read');
  await page.getByLabel('Choose images', { exact: true }).setInputFiles({ name: 'picture.webp', mimeType: 'image/webp', buffer: Buffer.from('bad') });
  await expect(page.locator('.error-message')).toContainText('not supported');
});

test('all five tools are discoverable and new workspaces fit 390px screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.home-tool-list .tool-link')).toHaveCount(19);
  for (const route of ['/compress-pdf/', '/jpg-to-pdf/', '/pdf-to-jpg/']) {
    await page.goto(route);
    await expect(page.locator('.upload-button')).toBeEnabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('.footer-tools a')).toHaveCount(19);
    await page.screenshot({ path: `research/${route.split('/')[1]}-mobile.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/pdf-to-jpg/');
  await page.screenshot({ path: 'research/pdf-to-jpg-desktop.png', fullPage: true });
});

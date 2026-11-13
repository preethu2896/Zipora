import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { monitorFileRequests } from './file-requests';

async function fixture(page: Page, format: string, width = 80, height = 40) {
  const base64 = await page.evaluate(({ format, width, height }) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, width / 2, height);
    return canvas.toDataURL(format, 1).split(',')[1];
  }, { format, width, height });
  return Buffer.from(base64, 'base64');
}

async function save(page: Page, label: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  const download = await pending;
  return { name: download.suggestedFilename(), bytes: await readFile((await download.path())!) };
}

async function pixels(page: Page, bytes: Buffer, type: string) {
  return page.evaluate(async ({ encoded, type }) => {
    const blob = new Blob([Uint8Array.from(atob(encoded), char => char.charCodeAt(0))], { type });
    const image = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    image.close();
    return { size: [canvas.width, canvas.height], first: [...ctx.getImageData(8, 8, 1, 1).data], last: [...ctx.getImageData(canvas.width - 8, canvas.height - 8, 1, 1).data] };
  }, { encoded: bytes.toString('base64'), type });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?*', route => route.abort());
});

test('WebP to JPG preserves dimensions and produces real JPG downloads', async ({ page }) => {
  const writes = monitorFileRequests(page);
  await page.goto('/webp-to-jpg/');
  const source = await fixture(page, 'image/webp');
  expect(source.subarray(8, 12).toString()).toBe('WEBP');
  await expect(page.getByRole('button', { name: 'Select images' })).toBeEnabled();
  const file = (name: string) => ({ name, mimeType: 'image/webp', buffer: source });
  await page.getByLabel('Choose files').setInputFiles(file('sample.webp'));
  await page.getByRole('button', { name: 'Convert images' }).click();
  const jpg = await save(page, 'Download image');
  expect(jpg.name).toMatch(/sample\.jpg$/);
  expect([...jpg.bytes.subarray(0, 2)]).toEqual([255, 216]);
  const decoded = await pixels(page, jpg.bytes, 'image/jpeg');
  expect(decoded.size).toEqual([80, 40]);
  expect(decoded.first[0]).toBeGreaterThan(200);
  expect(decoded.last).toEqual([255, 255, 255, 255]);
  await page.getByLabel('Choose files').setInputFiles(file('second.webp'));
  await expect(page.getByRole('button', { name: 'Remove second.webp' })).toBeVisible();
  await page.getByRole('button', { name: 'Convert images' }).click();
  const zip = await JSZip.loadAsync((await save(page, 'Download all images')).bytes);
  expect(Object.keys(zip.files)).toEqual(['01-sample.jpg', '02-second.jpg']);
  expect(writes).toEqual([]);
});

test('Rotate Image turns the selected orientation and exports rotated pixels and transparency', async ({ page }) => {
  const writes = monitorFileRequests(page);
  await page.goto('/rotate-image/');
  await expect(page.getByRole('button', { name: 'Select images' })).toBeEnabled();
  const landscape = await fixture(page, 'image/png');
  const portrait = await fixture(page, 'image/png', 40, 80);
  await page.getByLabel('Choose images').setInputFiles([
    { name: 'landscape.png', mimeType: 'image/png', buffer: landscape },
    { name: 'portrait.png', mimeType: 'image/png', buffer: portrait },
  ]);
  await page.getByRole('combobox', { name: 'Rotate batch' }).selectOption('landscape');
  await page.getByRole('button', { name: 'Rotate batch right' }).click();
  await expect(page.getByText('40 × 80 px · 90°')).toBeVisible();
  await page.getByRole('button', { name: 'Save rotated images' }).click();
  const zip = await JSZip.loadAsync((await save(page, 'Download all images')).bytes);
  const turned = await zip.file('01-landscape-rotated.png')!.async('nodebuffer');
  expect(await zip.file('02-portrait.png')!.async('nodebuffer')).toEqual(portrait);
  const decoded = await pixels(page, turned, 'image/png');
  expect(decoded).toEqual({ size: [40, 80], first: [255, 0, 0, 255], last: [0, 0, 0, 0] });
  await page.getByRole('button', { name: 'Reset rotations' }).click();
  await expect(page.getByRole('button', { name: 'Download all images' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove portrait.png' }).click();
  await page.getByRole('button', { name: 'Rotate landscape.png left' }).click();
  await page.getByRole('button', { name: 'Save rotated images' }).click();
  const single = await save(page, 'Download image');
  expect(single.name).toBe('landscape-rotated.png');
  expect(await pixels(page, single.bytes, 'image/png')).toEqual({ size: [40, 80], first: [0, 0, 0, 0], last: [255, 0, 0, 255] });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(writes).toEqual([]);
});

import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import JSZip from 'jszip';

async function download(page: Page, label: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  const file = await pending;
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
}

test('generates a multi-size ICO and PNG pack with selectable sizes and background', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/favicon-generator/');
  await expect(page.getByRole('button', { name: 'Select image' })).toBeEnabled();
  await page.getByLabel('Choose favicon image').setInputFiles('tests/fixtures/red.png');
  await expect(page.getByRole('img', { name: '32 × 32 favicon preview' })).toBeVisible();
  const icon = await download(page, 'Download ICO');
  expect(icon.name).toBe('favicon.ico');
  expect([...icon.bytes.subarray(0, 6)]).toEqual([0, 0, 1, 0, 3, 0]);
  for (const [index, size] of [16, 32, 48].entries()) {
    const entry = 6 + index * 16;
    const offset = icon.bytes.readUInt32LE(entry + 12);
    expect(icon.bytes[entry]).toBe(size);
    expect(icon.bytes.readUInt32BE(offset + 16)).toBe(size);
    expect(icon.bytes.readUInt32BE(offset + 20)).toBe(size);
  }
  await page.getByRole('checkbox', { name: '256 × 256' }).check();
  await page.getByRole('checkbox', { name: 'Transparent background' }).uncheck();
  await page.getByRole('button', { name: 'Generate icons' }).click();
  const updated = await download(page, 'Download ICO');
  expect(updated.bytes.readUInt16LE(4)).toBe(4);
  expect(updated.bytes[6 + 3 * 16]).toBe(0);
  const pack = await download(page, 'Download icon pack');
  expect(pack.name).toBe('zipora-favicons.zip');
  const zip = await JSZip.loadAsync(pack.bytes);
  expect(Object.keys(zip.files)).toEqual(['favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png', 'favicon-48x48.png', 'favicon-256x256.png', 'apple-touch-icon.png']);
  const png = await zip.file('apple-touch-icon.png')!.async('nodebuffer');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([180, 180]);
  const corner = await page.evaluate(async data => {
    const image = await createImageBitmap(new Blob([Uint8Array.from(atob(data), char => char.charCodeAt(0))], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    image.close();
    return [...ctx.getImageData(0, 0, 1, 1).data];
  }, png.toString('base64'));
  expect(corner).toEqual([255, 255, 255, 255]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

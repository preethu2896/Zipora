import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import JSZip from 'jszip';
import { monitorFileRequests } from './file-requests';

async function download(page: Page, label: string) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  const file = await pending;
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
}

test('converts a real HEIC photo to a dimension-preserving JPG and packages a batch', async ({ page }) => {
  const requests = monitorFileRequests(page);
  const decoderRequests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/heic/decoder.mjs') decoderRequests.push(request.url());
  });
  await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?*', route => route.abort());
  const fixture = await readFile('tests/fixtures/heic-color-bars.heic');
  const file = (name: string) => ({ name, mimeType: 'image/heic', buffer: fixture });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/heic-to-jpg/');
  await expect(page.getByRole('button', { name: 'Select photos' })).toBeEnabled();
  await page.getByLabel('Choose HEIC photos').setInputFiles({ name: 'invalid.heic', mimeType: 'image/heic', buffer: Buffer.from('invalid') });
  await expect(page.locator('.tool-session-controls [role=alert]')).toContainText('not a supported format');
  await page.getByLabel('Choose HEIC photos').setInputFiles(file('color-bars.heic'));
  const convert = page.getByRole('button', { name: 'Convert to JPG', exact: true });
  await expect(convert).toBeEnabled();
  expect(decoderRequests).toEqual([]);
  await convert.click();
  const jpg = await download(page, 'Download JPG');
  expect(jpg.name).toBe('color-bars.jpg');
  expect([...jpg.bytes.subarray(0, 2)]).toEqual([255, 216]);
  expect(decoderRequests).toHaveLength(1);
  const info = await page.evaluate(async base64 => {
    const data = Uint8Array.from(atob(base64), value => value.charCodeAt(0));
    const image = await createImageBitmap(new Blob([data], { type: 'image/jpeg' }));
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    image.close();
    return { width: canvas.width, height: canvas.height, left: [...ctx.getImageData(8, 24, 1, 1).data], right: [...ctx.getImageData(54, 24, 1, 1).data] };
  }, jpg.bytes.toString('base64'));
  expect([info.width, info.height]).toEqual([64, 48]);
  expect(info.left[2]).toBeGreaterThan(info.left[0] + 90);
  expect(info.right[0]).toBeGreaterThan(info.right[2] + 90);

  await page.getByLabel('Choose HEIC photos').setInputFiles(file('second.heif'));
  await expect(page.getByRole('button', { name: 'Download JPG', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Remove second.heif' })).toBeVisible();
  await convert.click();
  const archive = await download(page, 'Download all JPGs');
  const zip = await JSZip.loadAsync(archive.bytes);
  expect(archive.name).toBe('zipora-jpgs.zip');
  expect(Object.keys(zip.files)).toEqual(['01-color-bars.jpg', '02-second.jpg']);
  for (const item of Object.values(zip.files)) expect([...(await item.async('uint8array')).subarray(0, 2)]).toEqual([255, 216]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});

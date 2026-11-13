import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { monitorFileRequests } from './file-requests';

async function downloadCrop(page: Page) {
  await page.getByRole('button', { name: 'Crop image', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download image' }).click();
  const download = await pending;
  return { name: download.suggestedFilename(), bytes: await readFile((await download.path())!) };
}

async function inspectImage(page: Page, bytes: Buffer, mime: string) {
  return page.evaluate(async ({ data, mime }) => {
    const pixels = Uint8Array.from(atob(data), char => char.charCodeAt(0));
    const image = await createImageBitmap(new Blob([pixels], { type: mime }));
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    image.close();
    return {
      width: canvas.width,
      height: canvas.height,
      top: Array.from(ctx.getImageData(20, 20, 1, 1).data),
      bottom: Array.from(ctx.getImageData(20, 100, 1, 1).data),
    };
  }, { data: bytes.toString('base64'), mime });
}

test('Crop Image draws and exports an exact pixel rectangle with PNG alpha and JPG matte', async ({ page }, testInfo) => {
  const requests = monitorFileRequests(page);
  await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?*', route => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/crop-image/');
  await expect(page.getByRole('button', { name: 'Select image' })).toBeEnabled();
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(0, 0, 80, 120);
    ctx.fillStyle = '#00ff00';
    ctx.fillRect(80, 0, 80, 60);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.getByLabel('Choose image').setInputFiles({ name: 'sample.png', mimeType: 'image/png', buffer: Buffer.from(data, 'base64') });
  const preview = page.getByTestId('crop-preview');
  await preview.scrollIntoViewIfNeeded();
  await page.getByRole('img', { name: 'Image crop preview' }).evaluate((image: HTMLImageElement) => image.decode());
  const bounds = (await preview.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + 5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width - 5, bounds.y + bounds.height - 5, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByLabel('Position X (px)')).toHaveValue('80');
  await expect(page.getByLabel('Width (px)')).toHaveValue('75');
  await page.getByRole('button', { name: 'Reset selection' }).click();
  await expect(page.getByLabel('Width (px)')).toHaveValue('160');
  await page.getByLabel('Position X (px)').fill('80');
  await expect(page.getByRole('button', { name: 'Crop image', exact: true })).toBeDisabled();
  await page.getByLabel('Width (px)').fill('80');
  await testInfo.attach('Mobile crop selection', { body: await page.screenshot(), contentType: 'image/png' });
  const png = await downloadCrop(page);
  expect(png.name).toBe('sample-cropped.png');
  expect(await inspectImage(page, png.bytes, 'image/png')).toEqual({ width: 80, height: 120, top: [0, 255, 0, 255], bottom: [0, 0, 0, 0] });

  await page.getByLabel('Output format').selectOption('image/jpeg');
  await expect(page.getByRole('button', { name: 'Download image' })).toHaveCount(0);
  const jpg = await downloadCrop(page);
  expect(jpg.name).toBe('sample-cropped.jpg');
  expect((await inspectImage(page, jpg.bytes, 'image/jpeg')).bottom).toEqual([255, 255, 255, 255]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});

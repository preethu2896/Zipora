import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { monitorFileRequests } from './file-requests';

test('Remove Background downloads a transparent PNG with the original dimensions', async ({ page }) => {
  const requests = monitorFileRequests(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/remove-background/');
  await expect(page.getByRole('button', { name: 'Select image' })).toBeEnabled();
  await page.getByLabel('Choose image', { exact: true }).setInputFiles('tests/fixtures/portrait.jpg');
  await page.getByRole('button', { name: 'Remove background', exact: true }).click();
  const downloadButton = page.getByRole('button', { name: 'Download PNG' });
  await expect(downloadButton).toBeVisible({ timeout: 60_000 });
  const pending = page.waitForEvent('download');
  await downloadButton.click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('portrait-transparent.png');
  const bytes = await readFile((await download.path())!);
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const result = await page.evaluate(async base64 => {
    const original = document.querySelector<HTMLImageElement>('img[alt="Original image"]')!;
    await original.decode();
    const image = new Image();
    image.src = 'data:image/png;base64,' + base64;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0, opaque = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] <= 5) transparent++;
      if (data[i] >= 250) opaque++;
    }
    return { sameSize: canvas.width === original.naturalWidth && canvas.height === original.naturalHeight, transparent, opaque, pixels: data.length / 4 };
  }, bytes.toString('base64'));
  expect(result.sameSize).toBe(true);
  expect(result.transparent).toBeGreaterThan(result.pixels * 0.05);
  expect(result.opaque).toBeGreaterThan(result.pixels * 0.05);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

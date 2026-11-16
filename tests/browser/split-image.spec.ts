import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import JSZip from 'jszip';
import { monitorFileRequests } from './file-requests';

test('splits a mobile image into ordered transparent PNGs and downloads a ZIP locally', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = monitorFileRequests(page);
  await page.route('https://**/*', route => route.abort());
  await page.goto('/split-image/');
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 101;
    canvas.height = 61;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#ff0000';
    context.fillRect(0, 0, 50, 30);
    return canvas.toDataURL().split(',')[1];
  });
  await page.getByLabel('Choose image').setInputFiles({ name: 'odd.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.getByRole('button', { name: 'Grid', exact: true }).click();
  await expect(page.getByLabel('Rows')).toHaveValue('2');
  const zipEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all 4 as ZIP' }).click();
  const archive = await JSZip.loadAsync(await readFile((await (await zipEvent).path())!));
  expect(Object.keys(archive.files)).toEqual(['01.png', '02.png', '03.png', '04.png']);
  const inspect = async (name: string) => page.evaluate(async bytes => {
    const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(bytes), char => char.charCodeAt(0))], { type: 'image/png' }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    return [canvas.width, canvas.height, ...context.getImageData(0, 0, 1, 1).data];
  }, await archive.file(name)!.async('base64'));
  expect(await inspect('01.png')).toEqual([50, 30, 255, 0, 0, 255]);
  expect(await inspect('04.png')).toEqual([51, 31, 0, 0, 0, 0]);
  const pngEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download tile 4' }).click();
  const individual = await pngEvent;
  expect(individual.suggestedFilename()).toBe('04.png');
  expect(await readFile((await individual.path())!)).toEqual(await archive.file('04.png')!.async('nodebuffer'));
  expect(requests).toEqual([]);
});

test('sample panorama supports 20 pieces, horizontal JPEG export and an X caption preview', async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.goto('/split-image/');
  await page.getByRole('button', { name: 'Try sample panorama' }).click();
  await expect(page.getByRole('button', { name: 'Download all 20 as ZIP' })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'More pieces' })).toBeDisabled();
  await page.getByRole('button', { name: 'Horizontal', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Piece count' }).fill('3');
  await page.getByRole('button', { name: 'JPEG', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect 03.jpg' }).click();
  await expect(page.getByRole('status')).toContainText('03.jpg');
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download tile 3' }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('03.jpg');
  expect((await readFile((await download.path())!)).subarray(0, 3)).toEqual(Buffer.from([255, 216, 255]));
  await page.getByLabel('Caption for X').fill('My panorama & tiles');
  await page.getByRole('button', { name: 'Mobile', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mobile', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('link', { name: 'Post to X' })).toHaveAttribute('href', 'https://x.com/intent/post?text=My%20panorama%20%26%20tiles');
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Try sample panorama' })).toBeVisible();
});

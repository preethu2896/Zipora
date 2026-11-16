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
  await page.getByLabel('Rows').selectOption('2');
  await page.getByRole('button', { name: 'Split image', exact: true }).click();
  const zipEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download all as ZIP' }).click();
  const archive = await JSZip.loadAsync(await readFile((await (await zipEvent).path())!));
  expect(Object.keys(archive.files)).toEqual(['tile-01.png', 'tile-02.png', 'tile-03.png', 'tile-04.png']);
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
  expect(await inspect('tile-01.png')).toEqual([50, 30, 255, 0, 0, 255]);
  expect(await inspect('tile-04.png')).toEqual([51, 31, 0, 0, 0, 0]);
  const pngEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download tile 4' }).click();
  const individual = await pngEvent;
  expect(individual.suggestedFilename()).toBe('tile-04.png');
  expect(await readFile((await individual.path())!)).toEqual(await archive.file('tile-04.png')!.async('nodebuffer'));
  expect(requests).toEqual([]);
});

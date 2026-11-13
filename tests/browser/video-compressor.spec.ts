import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { monitorFileRequests } from './file-requests';

test('Video Compressor downloads a smaller playable MP4', async ({ page }) => {
  const requests = monitorFileRequests(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/video-compressor/');
  await expect(page.getByRole('button', { name: 'Select video' })).toBeEnabled();
  const fixture = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 960;
    canvas.height = 540;
    const ctx = canvas.getContext('2d')!;
    const stream = canvas.captureStream(24);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 6_000_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const completed = new Promise<Blob>(resolve => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
    });
    const pixels = ctx.createImageData(canvas.width, canvas.height);
    let seed = 12;
    recorder.start();
    for (let frame = 0; frame < 36; frame++) {
      for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const color = seed >>> 24;
        pixels.data.set([color, color, color, 255], i);
      }
      ctx.putImageData(pixels, 0, 0);
      await new Promise(resolve => setTimeout(resolve, 42));
    }
    recorder.stop();
    const blob = await completed;
    stream.getTracks().forEach(track => track.stop());
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.getByLabel('Choose video').setInputFiles({ name: 'fixture.webm', mimeType: 'video/webm', buffer: Buffer.from(fixture) });
  await page.getByLabel('Compression preset').selectOption('smaller');
  await page.getByRole('button', { name: 'Compress video', exact: true }).click();
  const button = page.getByRole('button', { name: 'Download MP4' });
  await expect(button).toBeVisible({ timeout: 45_000 });
  const pending = page.waitForEvent('download');
  await button.click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe('fixture-compressed.mp4');
  const bytes = await readFile((await download.path())!);
  expect(bytes.length).toBeLessThan(fixture.length);
  expect(bytes.toString('ascii', 4, 8)).toBe('ftyp');
  const result = page.locator('figure').filter({ hasText: 'Compressed' }).locator('video');
  await expect.poll(() => result.evaluate(video => (video as HTMLVideoElement).videoHeight)).toBe(480);
  expect(await result.evaluate(video => (video as HTMLVideoElement).duration)).toBeGreaterThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(requests).toEqual([]);
});

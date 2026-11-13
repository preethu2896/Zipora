import { expect, test } from '@playwright/test';

test('the homepage playground re-encodes a real image and the navigation stays usable', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('h1 > span')).toHaveText(['Your files.', 'Done in a flash.']);
  await expect(page.locator('h1 > span').last()).toHaveCSS('color', 'rgb(37, 99, 235)');
  const stats = page.locator('.home-demo-stats dd');
  await expect(stats.nth(2)).toHaveText(/^\d+(\.\d+)?%$/);
  const balanced = await stats.nth(1).innerText();
  await page.getByRole('button', { name: 'Smallest', exact: true }).click();
  await expect(stats.nth(1)).not.toHaveText(balanced);
  await expect(stats.nth(1)).not.toHaveText('—');
  await page.getByRole('button', { name: 'WebP', exact: true }).click();
  await expect(page.locator('.home-image-compare img')).toHaveCount(2);
  await expect.poll(() => page.locator('.home-image-compare img').last().evaluate(async element =>
    (await fetch((element as HTMLImageElement).src)).headers.get('content-type'),
  )).toBe('image/webp');
  await page.getByRole('slider', { name: 'Compare original and compressed image' }).press('End');
  await expect(page.getByRole('slider', { name: 'Compare original and compressed image' })).toHaveValue('100');
  await page.getByRole('link', { name: 'Search tools', exact: true }).click();
  const search = page.getByRole('searchbox');
  await expect(search).toBeFocused();
  await search.fill('passport');
  await expect(page.locator('.home-tool-list .tool-link')).toHaveCount(1);
  await search.fill('');
  await expect(page.locator('.home-tool-list .tool-link')).toHaveCount(41);
  await expect(page.locator('.footer-tools a')).toHaveCount(41);
  const recent = page.locator('.landing-section').filter({ has: page.getByRole('heading', { name: 'Recently added' }) });
  await expect(recent.locator('a').nth(0)).toHaveText('Video Compressor');
  await expect(recent.locator('a').nth(1)).toHaveText('Remove Background');
  await expect(recent.locator('a').nth(2)).toHaveText('Gemini Video Watermark Remover');
  await expect(recent.locator('a').nth(3)).toHaveText('Gemini Image Watermark Remover');
  await expect(page.locator('.home-header')).toBeInViewport();
  await page.getByText('Do my files leave my device?', { exact: true }).click();
  await expect(page.getByText(/never uploaded to a file-processing server/)).toBeVisible();
  for (const width of [390, 500, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.locator('.home-hero')).toHaveCSS('background-image', /radial-gradient/);
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), animations: 'disabled' });
  }
});

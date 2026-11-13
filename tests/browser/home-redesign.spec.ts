import { expect, test } from '@playwright/test';

test('homepage sidebar, sponsor frames, and tool search work on desktop and mobile', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Free PDF, Image & Video Tools');
  await expect(page.locator('.zipora-home')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.home-sidebar')).toHaveCSS('position', 'fixed');
  await expect(page.locator('.home-popular a')).toHaveCount(6);
  await expect(page.locator('.home-sponsors li')).toHaveCount(12);
  await expect(page.locator('.home-sponsors li').last()).toContainText('Frame 12 is free');
  await expect(page.locator('.home-card-top .home-new')).toHaveCount(4);
  await expect(page.locator('.home-transform')).toHaveCount(41);
  await expect(page.locator('.home-task-grid section')).toHaveCount(5);
  await expect(page.locator('.home-faq details')).toHaveCount(6);

  const links = page.locator('.home-tool-list .tool-link');
  const toolPaths = await links.evaluateAll(items => items.map(item => item.getAttribute('href')!));
  expect(new Set(toolPaths).size).toBe(41);
  const sidebarPaths = await page.locator('#home-navigation section').evaluateAll(sections =>
    sections.slice(0, 3).flatMap(section => Array.from(section.querySelectorAll('a'), link => link.getAttribute('href'))),
  );
  const footerPaths = await page.locator('.footer-tools a').evaluateAll(items => items.map(item => item.getAttribute('href')));
  expect(sidebarPaths.sort()).toEqual([...toolPaths].sort());
  expect(footerPaths.sort()).toEqual([...toolPaths].sort());
  for (const href of toolPaths) expect((await request.get(href)).status(), href).toBe(200);

  const recent = page.locator('.landing-section').filter({ has: page.getByRole('heading', { name: 'Recently added' }) });
  await expect(recent.locator('a')).toHaveText(['Video Compressor', 'Remove Background', 'Gemini Image Watermark Remover', 'Gemini Video Watermark Remover']);
  await page.keyboard.press('Control+k');
  const search = page.getByRole('searchbox');
  await expect(search).toBeFocused();
  await search.fill('merge');
  await expect(links).toHaveCount(1);
  await search.fill('zzz');
  await expect(links).toHaveCount(0);
  await expect(page.getByText('No tools match')).toBeVisible();
  await search.fill('');
  await expect(links).toHaveCount(41);
  await page.getByText('Do my files leave my device?', { exact: true }).click();
  await expect(page.getByText(/never uploaded to a file-processing server/)).toBeVisible();

  for (const width of [390, 500, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    if (width < 800) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await expect(page.locator('#home-navigation')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
    }
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), animations: 'disabled' });
  }
});

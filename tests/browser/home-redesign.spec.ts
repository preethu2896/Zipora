import { expect, test } from '@playwright/test';

test('homepage navigation, sponsor frames, and tool search work on desktop and mobile', async ({ page, request }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Free PDF, Image & Video Tools');
  await expect(page.locator('.zipora-home')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.locator('.home-sidebar')).toHaveCSS('position', 'sticky');
  await expect(page.locator('.home-split-preview').getByRole('link')).toHaveAttribute('href', '/split-image/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.locator('#home-navigation').getByRole('link', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.keyboard.press('Escape');
  await expect(page.locator('.ad-slot')).toHaveCount(0);
  await expect(page.getByRole('img', { name: /Product Hunt/ })).toHaveCSS('width', '160px');
  await expect(page.locator('.home-popular a')).toHaveCount(8);
  await expect(page.locator('.home-popular a[href="/split-image/"]')).toHaveCount(0);
  const artwork = page.locator('.home-popular img');
  await artwork.last().scrollIntoViewIfNeeded();
  await expect.poll(() => artwork.evaluateAll(images => images.filter(image => (image as HTMLImageElement).naturalWidth > 0).length)).toBe(8);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('.home-sponsors')).toHaveCount(0);
  await expect(page.locator('footer .footer-brand').getByRole('link', { name: 'Preetham' })).toHaveAttribute('href', 'https://x.com/PreethamBhand14');
  await expect(page.locator('.home-sidebar')).toHaveAttribute('data-navigation', 'hero');
  await page.locator('#tools').scrollIntoViewIfNeeded();
  await expect(page.locator('.home-sidebar')).toHaveAttribute('data-navigation', 'floating');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(page.locator('.home-sidebar')).toHaveAttribute('data-navigation', 'hero');
  await expect(page.locator('.home-card-top .home-new')).toHaveCount(4);
  await expect(page.locator('.home-transform')).toHaveCount(42);
  await expect(page.locator('.home-task-grid section')).toHaveCount(5);
  await expect(page.locator('.home-faq details')).toHaveCount(6);

  const links = page.locator('.home-tool-list .tool-link');
  const toolPaths = await links.evaluateAll(items => items.map(item => item.getAttribute('href')!));
  expect(new Set(toolPaths).size).toBe(42);
  const sidebarPaths = await page.locator('#home-navigation section').evaluateAll(sections =>
    sections.slice(0, 3).flatMap(section => Array.from(section.querySelectorAll('a'), link => link.getAttribute('href'))),
  );
  const footerPaths = await page.locator('.footer-tools a').evaluateAll(items => items.map(item => item.getAttribute('href')));
  expect(sidebarPaths.sort()).toEqual([...toolPaths].sort());
  expect(footerPaths.sort()).toEqual([...toolPaths].sort());
  for (const href of toolPaths) expect((await request.get(href)).status(), href).toBe(200);

  const recent = page.locator('.landing-section').filter({ has: page.getByRole('heading', { name: 'Recently added' }) });
  await expect(recent.locator('a')).toHaveText(['Split Image', 'Video Compressor', 'Remove Background', 'Gemini Image Watermark Remover']);
  await page.keyboard.press('Control+k');
  const search = page.getByRole('searchbox');
  await expect(search).toBeFocused();
  await search.fill('merge');
  await expect(links).toHaveCount(1);
  await search.fill('zzz');
  await expect(links).toHaveCount(0);
  await expect(page.getByText('No tools match')).toBeVisible();
  await search.fill('');
  await expect(links).toHaveCount(42);
  await page.getByText('Do my files leave my device?', { exact: true }).click();
  await expect(page.getByText(/never uploaded to a file-processing server/)).toBeVisible();

  for (const width of [390, 500, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const popularColumns = await page.locator('.home-popular').evaluate(grid => getComputedStyle(grid).gridTemplateColumns.split(' ').length);
    expect(popularColumns).toBe(width < 800 ? 1 : 3);
    if (width < 800) {
      for (const [selector, columns] of [['.home-popular', 1], ['.home-tool-list', 1]] as const) {
        const count = await page.locator(selector).first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
        expect(count, selector).toBe(columns);
      }
      await expect(page.locator('#tools').getByRole('searchbox')).toBeVisible();
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await expect(page.locator('#home-navigation')).toBeVisible();
      await expect(page.locator('#home-navigation').getByRole('link', { name: 'Home', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
    }
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), animations: 'disabled' });
  }
});

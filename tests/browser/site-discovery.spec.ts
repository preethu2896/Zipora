import { expect, test } from '@playwright/test';
import { siteTools } from '../../src/lib/site-content';

test('every tool fits at 500px and links to local pages and reporting', async ({ page, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 500, height: 900 });
  const links = new Set<string>();
  for (const tool of siteTools) {
    const path = `/${tool.slug}/`;
    expect((await page.goto(path))?.status(), path).toBe(200);
    await expect(page.getByText('Processed in your browser — not uploaded.', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Report a problem' })).toHaveAttribute(
      'href', `mailto:contact@zipora.online?subject=${encodeURIComponent('Zipora problem — ' + tool.name)}`,
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), path).toBe(true);
    for (const href of await page.locator('a[href^="/"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')!))) {
      links.add(href.split('#')[0]);
    }
  }
  for (const href of links) expect((await request.get(href)).status(), href).toBe(200);
});

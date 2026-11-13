import { test, expect } from '@playwright/test';
import { publicPaths, siteTools } from '../../src/lib/site-content';
import { blogPaths } from '../../src/lib/blog';
import { absoluteUrl } from '../../src/lib/site-url';

const paths = [...new Set([...publicPaths, ...blogPaths])];
const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

test('all canonical pages export unique metadata, social cards and consistent visible-matching entities', async ({ page }) => {
  const titles = new Set<string>(), descriptions = new Set<string>();
  for (const path of paths) {
    expect((await page.goto(path))?.status(), path).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    const title = await page.title(), description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(title.length, path).toBeGreaterThan(10); expect(description!.length, path).toBeGreaterThan(30);
    expect(titles.has(title), `Duplicate title at ${path}`).toBe(false);
    expect(descriptions.has(description!), `Duplicate description at ${path}`).toBe(false);
    titles.add(title); descriptions.add(description!);
    const canonical = `https://www.zipora.online${path}`;
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', canonical);
    expect(await page.locator('meta[name="robots"]').evaluateAll(nodes => nodes.map(n => n.getAttribute('content')).join(' '))).not.toContain('noindex');
    for (const [property, value] of [['og:title', title], ['og:description', description!], ['og:url', canonical], ['og:site_name', 'Zipora'], ['og:image', absoluteUrl('/social-card.png')], ['og:image:width', '1200'], ['og:image:height', '630']]) {
      await expect(page.locator(`meta[property="${property}"]`)).toHaveAttribute('content', value);
    }
    for (const [name, value] of [['twitter:card', 'summary_large_image'], ['twitter:title', title], ['twitter:description', description!], ['twitter:image', absoluteUrl('/social-card.png')]]) {
      await expect(page.locator(`meta[name="${name}"]`)).toHaveAttribute('content', value);
    }
    const graph = await page.locator('script[type="application/ld+json"]').evaluateAll(nodes => nodes.flatMap(node => {
      const data = JSON.parse(node.textContent!); return data['@graph'] || [data];
    }));
    const organization = graph.filter(node => node['@type'] === 'Organization'), websites = graph.filter(node => node['@type'] === 'WebSite');
    expect(organization).toHaveLength(1); expect(websites).toHaveLength(1);
    expect(organization[0]).toMatchObject({ '@id': absoluteUrl('/#organization'), name: 'Zipora', url: absoluteUrl('/') });
    expect(websites[0]).toMatchObject({ '@id': absoluteUrl('/#website'), publisher: { '@id': organization[0]['@id'] } });
    const ids = graph.filter(n => n['@id']).map(n => n['@id']); expect(new Set(ids).size).toBe(ids.length);
    expect(JSON.stringify(graph)).not.toMatch(/aggregateRating|ratingValue/);
    const pages = graph.filter(node => ['WebPage', 'AboutPage', 'ContactPage', 'CollectionPage'].includes(node['@type']));
    expect(pages).toHaveLength(1); expect(pages[0].url).toBe(canonical);
    const faq = graph.find(node => node['@type'] === 'FAQPage');
    if (faq) {
      const visible = await page.locator('.faqs details').evaluateAll(nodes => nodes.map(node => ({
        question: node.querySelector('summary')!.textContent!, answer: [...node.querySelectorAll('p')].map(p => p.textContent).join(' '),
      })));
      expect(faq.mainEntity.map((q: { name: string; acceptedAnswer: { text: string } }) => ({ question: normalize(q.name), answer: normalize(q.acceptedAnswer.text) }))).toEqual(visible.map(v => ({ question: normalize(v.question), answer: normalize(v.answer) })));
    }
    const tool = siteTools.find(tool => path === `/${tool.slug}/`);
    if (tool) expect(graph.find(node => node['@type'] === 'SoftwareApplication')).toMatchObject({ name: `Zipora ${tool.name}`, url: canonical, offers: { price: '0' } });
    if (path.startsWith('/blog/') && path !== '/blog/') {
      expect(graph.find(node => node['@type'] === 'Article')).toMatchObject({ mainEntityOfPage: canonical, author: { '@id': organization[0]['@id'] }, publisher: { '@id': organization[0]['@id'] } });
      await expect(page.locator('.review-date a[href="/about/"]')).toHaveText('Zipora');
    }
  }
  expect(paths).toHaveLength(59); expect(siteTools).toHaveLength(39);
});

test('discovery files, compatibility canonicals and sharing/icon assets are statically available', async ({ request, page }) => {
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]).sort()).toEqual(paths.map(absoluteUrl).sort());
  expect(sitemap).not.toContain('<lastmod>');
  for (const alias of ['/image-resizer/', '/pdf-compressor/']) expect(sitemap).not.toContain(`<loc>${absoluteUrl(alias)}</loc>`);
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain(`Sitemap: ${absoluteUrl('/sitemap.xml')}`); expect(robots).not.toContain('Disallow: /');
  const llms = await (await request.get('/llms.txt')).text();
  for (const path of paths) expect(llms).toContain(absoluteUrl(path));
  expect(llms).toContain('mailto:contact@zipora.online'); expect(llms).toContain('/third-party-notices.txt'); expect(llms).not.toMatch(/https:\/\/zipora\.online/);
  const social = await request.get('/social-card.png'); expect(social.status()).toBe(200); expect(social.headers()['content-type']).toContain('image/png');
  const png = await social.body(); expect(png.subarray(1, 4).toString()).toBe('PNG'); expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  for (const path of ['/icon.png', '/apple-icon.png', '/logo.png']) { const response = await request.get(path); expect(response.status()).toBe(200); expect(response.headers()['content-type']).toContain('image/png'); }
  for (const [alias, canonical] of [['image-resizer', 'resize-image'], ['pdf-compressor', 'compress-pdf']]) {
    await page.goto(`/${alias}/`); await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', absoluteUrl(`/${canonical}/`)); await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', absoluteUrl(`/${canonical}/`));
  }
  await page.goto('/404.html'); expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
});

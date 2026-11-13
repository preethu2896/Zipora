import { test,expect } from '@playwright/test';
import { siteTools,publicPaths } from '../../src/lib/site-content';
import { absoluteUrl,siteUrl,contactEmail } from '../../src/lib/site-url';
test('thirty-two tool pages have unique metadata, honest content, valid schema and direct links',async({page})=>{
 const titles=new Set<string>(),descriptions=new Set<string>(),headings=new Set<string>();
 for(const tool of siteTools){
  await page.goto(`/${tool.slug}/`);await expect(page.locator('h1')).toHaveCount(1);await expect(page.locator('h1')).toHaveText(tool.h1);
  expect(await page.title()).toBe(tool.title);const description=await page.locator('meta[name=description]').getAttribute('content');expect(description).toBe(tool.description);
  titles.add(await page.title());descriptions.add(description!);headings.add(await page.locator('h1').innerText());
  await expect(page.locator('.footer-tools a')).toHaveCount(41);await expect(page.locator('.breadcrumb')).toHaveCount(0);
  await expect(page.locator('.what-next')).toHaveCount(0);await expect(page.locator('.side-panel')).toBeVisible();
  expect(await page.locator('.related-tools').evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('#how-it-works')!)&Node.DOCUMENT_POSITION_FOLLOWING))).toBeTruthy();
  await expect(page.locator('.ad-footer')).toHaveCount(0);
  await expect(page.locator('#how-it-works .steps li')).toHaveCount(3);await expect(page.locator('.faqs details')).toHaveCount(3);
  await expect(page.locator('.ad-slot')).toHaveCount(0);await expect(page.locator('[data-slot=sunset-bloom-background]')).toHaveCount(0);
  const graph=await page.locator('script[type="application/ld+json"]').evaluateAll(nodes=>nodes.flatMap(node=>JSON.parse(node.textContent||'{}')['@graph']||[]));
  expect(graph.map(x=>x['@type'])).toEqual(expect.arrayContaining(['SoftwareApplication','BreadcrumbList']));
  expect(graph.find(x=>x['@type']==='SoftwareApplication')).toMatchObject({name:`Zipora ${tool.name}`,url:absoluteUrl(`/${tool.slug}/`),offers:{price:'0'}});
  const related=await page.locator('.related-tools a').evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')));expect(related).toEqual(tool.related.map(slug=>`/${slug}/`));
  expect(await page.locator('body').innerText()).not.toMatch(new RegExp(['file','bolt'].join(''),'i'));
 }
 expect(titles.size).toBe(41);expect(descriptions.size).toBe(41);expect(headings.size).toBe(41);
});
test('crawl files include all canonical pages, permit crawlers and keep aliases canonical',async({request,page})=>{
 const sitemap=await request.get('/sitemap.xml');expect(sitemap.ok()).toBeTruthy();const xml=await sitemap.text();for(const path of publicPaths)expect(xml).toContain(absoluteUrl(path));
 const sitemapUrls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]);expect(sitemapUrls.length).toBeGreaterThanOrEqual(publicPaths.length);for(const url of sitemapUrls)expect(new URL(url).origin).toBe(new URL(siteUrl).origin);
 const robots=await(await request.get('/robots.txt')).text();for(const name of ['*','GPTBot','ClaudeBot','PerplexityBot','Google-Extended'])expect(robots).toContain(`User-Agent: ${name}`);expect(robots).not.toContain('Disallow: /');
 const llms=await(await request.get('/llms.txt')).text();for(const tool of siteTools)expect(llms).toContain(`/${tool.slug}/`);expect(llms).toContain('/compare/zipora-vs-removebg/');
 for(const [alias,canonical] of [['image-resizer','resize-image'],['pdf-compressor','compress-pdf']]){await page.goto(`/${alias}/`);expect(await page.locator('link[rel=canonical]').getAttribute('href')).toBe(absoluteUrl(`/${canonical}/`));await expect(page.locator('.upload-button')).toBeEnabled();}
});
test('all internal page links resolve, including legal and comparison breadcrumbs',async({page,request})=>{
 const targets=new Set<string>();
 for(const path of [...publicPaths,'/compare/']){const response=await page.goto(path);expect(response?.status()).toBe(200);for(const href of await page.locator('a[href]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href')!)))if(href.startsWith('/'))targets.add(href.split('#')[0]||'/');}
 for(const href of targets)expect((await request.get(href)).status(),href).toBe(200);
 expect((await request.get('/this-page-does-not-exist/')).status()).toBe(404);
 // The generic Python preview does not map misses to custom 404.html; static hosts such as Vercel do.
 await page.goto('/404.html');await expect(page.getByRole('heading',{name:'That page isn’t here'})).toBeVisible();
});
test('compact mobile header/menu, quiet hero, grouped cards and public contact work',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page).toHaveTitle('Free Online PDF, Image, Video and QR Tools | Zipora');
 await expect(page.locator('[data-slot=sunset-bloom-background]')).toHaveCount(0);
 await expect(page.locator('#pdf-tools .tool-link')).toHaveCount(18);await expect(page.locator('#image-tools .tool-link')).toHaveCount(15);await expect(page.locator('#other-tools .tool-link')).toHaveCount(8);
 const columns=()=>page.locator('#pdf-tools .home-tool-list').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
 expect(await columns()).toBe(1);
 await page.setViewportSize({width:768,height:1000});expect(await columns()).toBe(2);
 await page.setViewportSize({width:1440,height:1000});expect(await columns()).toBe(2);
 await page.setViewportSize({width:390,height:844});
 await page.getByRole('button',{name:'Open navigation'}).click();await expect(page.locator('#home-navigation')).toBeVisible();await page.locator('#home-navigation').getByRole('link',{name:'Merge PDF',exact:true}).click();await expect(page).toHaveURL(/merge-pdf/);
 for(const path of publicPaths){await page.goto(path);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),path).toBeTruthy();if(siteTools.some(t=>path===`/${t.slug}/`)){await expect(page.locator('.side-panel')).toBeHidden();await expect(page.locator('.ad-sidebar')).toHaveCount(0);}}
 await page.goto('/contact/');await expect(page.locator('.contact-address')).toHaveText(`Contact email: ${contactEmail}`);await expect(page.locator('.contact-address a')).toHaveAttribute('href',`mailto:${contactEmail}`);await expect(page.locator('.contact-message a')).toHaveAttribute('href',`mailto:${contactEmail}`);await expect(page.locator('main')).not.toContainText('Contact email — coming soon');
 await page.goto('/compare/zipora-vs-removebg/');await expect(page.locator('.availability-note')).toContainText('Remove Background is available');await expect(page.locator('.sources a').first()).toHaveAttribute('href','https://www.remove.bg/faq');
});

test('all card descriptions fit without truncation at phone and desktop widths',async({page})=>{
 for(const width of [390,500,1440]){
  await page.setViewportSize({width,height:1000});await page.goto('/');
  await expect(page.locator('.home-tool-list .tool-link p')).toHaveCount(41);
  const failures=await page.locator('.home-tool-list .tool-link p,.popular-grid p').evaluateAll(nodes=>nodes.filter(node=>{const el=node as HTMLElement,style=getComputedStyle(el);return el.scrollWidth>el.clientWidth+1||el.getBoundingClientRect().height>2*parseFloat(style.lineHeight)+1||el.textContent?.includes('...');}).map(el=>el.textContent));
  expect(failures).toEqual([]);await expect(page.locator('.site-header input')).toHaveCount(0);
  if(width<=560) expect(await page.locator('.home-sidebar').evaluate(el=>el.getBoundingClientRect().height)).toBeLessThanOrEqual(65);
 }
});

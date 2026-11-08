import {test,expect} from '@playwright/test';
import {blogPosts,blogPaths} from '../../src/lib/blog';
import {absoluteUrl} from '../../src/lib/site-url';

test('contact mail links and privacy date are live without changing issue guidance',async({page})=>{
 await page.goto('/contact/');
 await expect(page.locator('main')).not.toContainText('coming soon');
 await expect(page.locator('.contact-address')).toHaveText('Contact email: contact@zipora.online');
 await expect(page.locator('.contact-message a')).toHaveAttribute('href','mailto:contact@zipora.online');
 await expect(page.locator('.contact-message')).toContainText('do not send private files, ID documents, passwords, or personal photos by email unless we ask for them');
 await expect(page.locator('.legal-section').filter({hasText:'When reporting an issue'}).locator('p')).toHaveText('When contact becomes available, include the tool name, browser, device and the error message. Use a synthetic sample if possible. Do not attach identity documents, passwords, confidential PDFs or personal photos unless a suitable support process has been agreed.');
 await expect(page.locator('footer a[href="mailto:contact@zipora.online"]')).toBeVisible();
 await page.goto('/privacy-policy/');
 await expect(page.locator('main')).toContainText('Updated 8 November 2026');
 await expect(page.locator('main')).not.toContainText('Public contact details are pending');
 await expect(page.locator('.legal-section').filter({hasText:'Contact and changes'}).locator('a[href^="mailto:"]')).toHaveText('contact@zipora.online');
});

test('existing comparisons show updated facts and relevant calls to action',async({page})=>{
 await page.goto('/compare/zipora-vs-ilovepdf/');
 await expect(page.locator('table')).not.toContainText('Check on their site');
 await expect(page.locator('table')).toContainText('Merge PDF 100 MB');
 await expect(page.locator('table')).toContainText('$5/month billed yearly');
 await expect(page.locator('.review-date')).toContainText('8 November 2026');
 await page.goto('/compare/zipora-vs-removebg/');
 await expect(page.locator('table')).not.toContainText('Check on their site');
 await expect(page.locator('.intro')).toContainText('1 December 2026 at 9:00am CET');
 await expect(page.locator('.comparison-actions a')).toHaveText(['Try Image Compressor — Free','Try Resize Image — Free']);
 await expect(page.locator('.comparison-actions a').first()).toHaveAttribute('href','/image-compressor/');
 await expect(page.locator('.comparison-actions a').last()).toHaveAttribute('href','/resize-image/');
});

test('twelve blog cards and ten distinct articles export with schema, sources and correct tools',async({page,request})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/blog/');
 await expect(page.locator('h1')).toHaveText('Zipora Blog');
 await expect(page.locator('.blog-card')).toHaveCount(12);
 await expect(page.locator('.blog-card[href^="/compare/"]')).toHaveCount(2);
 await expect(page.locator('header nav a[href="/blog/"]')).toHaveCount(1);
 await expect(page.locator('footer a[href="/blog/"]')).toHaveCount(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:'research/blog-index-mobile.png',fullPage:true});
 for(const post of blogPosts){
  await page.goto(`/blog/${post.slug}/`);
  await expect(page.locator('h1')).toHaveText(post.h1);
  await expect(page.locator('table tbody tr')).toHaveCount(6);
  await expect(page.locator('.faqs details')).toHaveCount(3);
  const links=await page.locator('.comparison-actions a').evaluateAll(a=>a.map(a=>a.getAttribute('href')));
  expect(links).toEqual(post.tools.map(s=>`/${s}/`));
  await expect(page.locator('.sources a')).toHaveCount(post.sources.length);
  for(const href of links)expect((await request.get(href!)).status()).toBe(200);
  const schemas=await page.locator('script[type="application/ld+json"]').evaluateAll(s=>s.map(s=>JSON.parse(s.textContent!)));
  const article=schemas.find(s=>s['@type']==='Article'),faq=schemas.find(s=>s['@type']==='FAQPage');
  expect(article.datePublished).toBe('2026-11-08');expect(article.dateModified).toBe('2026-11-08');
  expect(faq.mainEntity).toHaveLength(3);
  expect(await page.locator('.faqs details').evaluateAll(d=>d.map(d=>d.querySelector('p')!.textContent))).toEqual(faq.mainEntity.map((q:any)=>q.acceptedAnswer.text));
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',absoluteUrl(`/blog/${post.slug}/`));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),post.slug).toBeTruthy();
  await expect(page.locator('.ad-blog-table')).toHaveCount(1);await expect(page.locator('.ad-footer')).toHaveCount(1);
  await expect(page.locator('.footer-tools a')).toHaveCount(19);
 }
 await page.screenshot({path:'research/blog-article-mobile.png',fullPage:true});
});

test('sitemap, bot rules and llms include all blog routes',async({request})=>{
 const sitemap=await (await request.get('/sitemap.xml')).text();
 const llms=await (await request.get('/llms.txt')).text();
 const robots=await (await request.get('/robots.txt')).text();
 for(const path of blogPaths){expect(sitemap).toContain(absoluteUrl(path));expect(llms).toContain(absoluteUrl(path));}
 for(const agent of ['GPTBot','ClaudeBot','PerplexityBot','Google-Extended'])expect(robots).toContain(`User-Agent: ${agent}`);
 expect(robots).not.toContain('Disallow: /');
});

test('footer navigation opens tools and editorial pages at top on every viewport',async({page})=>{
 for(const width of [1440,768,390]){
  await page.setViewportSize({width,height:844});
  await page.goto('/contact/');
  await expect(page.locator('header nav a[href="/blog/"]')).toHaveCount(1);
  const hrefs=await page.locator('footer a[href^="/"]').evaluateAll(a=>[...new Set(a.map(a=>a.getAttribute('href')!))].filter(h=>!h.includes('#')));
  for(const href of hrefs){
   const link=page.locator(`footer a[href="${href}"]`).first();await link.scrollIntoViewIfNeeded();
   await link.click();await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'$'));
   await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(3);
  }
  const same=page.locator(`footer a[href="${hrefs.at(-1)}"]`).first();await same.scrollIntoViewIfNeeded();await same.click();await expect.poll(()=>page.evaluate(()=>scrollY)).toBeLessThan(3);
  const all=page.locator('footer .footer-bottom a[href="/#tools"]');await all.scrollIntoViewIfNeeded();await all.click();await expect(page).toHaveURL(/\/#tools$/);await expect(page.locator('#tools')).toBeInViewport();
 }
});

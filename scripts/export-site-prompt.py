"""Export a single, copyable as-built prompt from the current static site."""
from pathlib import Path
from bs4 import BeautifulSoup, NavigableString, Tag
import json
import re

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'out'
DATA=json.loads((ROOT/'research/site-prompt-data.json').read_text(encoding='utf-8'))
lines=[]
def emit(text=''): lines.append(text)
def clean(text): return re.sub(r'\s+',' ',str(text)).strip()
def inline(node):
    if isinstance(node,NavigableString): return str(node)
    if not isinstance(node,Tag) or node.name in ['script','style','svg']: return ''
    text=''.join(inline(child) for child in node.children)
    if node.name=='a': return f'[{clean(text)}]({node.get("href", "")})'
    if node.name=='br': return ' / '
    if node.name=='img': return f' [Image: {node.get("alt", "")} | {node.get("src", "")}] ' if node.get('alt') else ''
    return text
def render(node):
    if isinstance(node,NavigableString):
        if clean(node): emit(clean(node))
        return
    if not isinstance(node,Tag) or node.name in ['script','style','svg']: return
    name=node.name
    if name in ['h1','h2','h3','h4','h5','h6']:
        emit('\n'+('#'*min(int(name[1])+2,6))+' '+clean(inline(node))); return
    if name=='table':
        emit('\n[Comparison table]')
        cap=node.find('caption')
        if cap: emit('Caption: '+clean(cap.get_text(' ',strip=True)))
        for i,row in enumerate(node.find_all('tr')):
            emit('| '+' | '.join(clean(inline(cell)).replace('|','\\|') for cell in row.find_all(['th','td'],recursive=False))+' |')
            if i==0: emit('| '+' | '.join('---' for _ in row.find_all(['th','td'],recursive=False))+' |')
        emit(); return
    if name in ['p','label','legend','summary','button','li','dt','dd']:
        prefix={'li':'- ','summary':'FAQ question: ','button':'Button: ','legend':'Field group: ','label':'Label: ','dt':'Statistic: ','dd':'Value: '}.get(name,'')
        text=clean(inline(node))
        if text: emit(prefix+text)
        return
    if name=='select': emit('Options: '+'; '.join(clean(o.get_text(' ',strip=True)) for o in node.find_all('option'))); return
    if name in ['input','textarea','img']: return
    if name=='a':
        text=clean(inline(node))
        if text: emit(text)
        return
    for child in node.children: render(child)
def soup_for(path):
    file=OUT/('index.html' if path=='/' else path.strip('/')+'/index.html')
    if path=='/404.html': file=OUT/'404.html'
    return BeautifulSoup(file.read_text(encoding='utf-8'),'html.parser')

emit('ZIPORA — COMPLETE AS-BUILT WEBSITE, CONTENT AND SEO MASTER PROMPT')
emit('Snapshot date: 8 November 2026. Generated from the current source and production export.')
emit('''
Act as the maintainer of the existing Zipora website. Use this entire document as one complete reference prompt. It describes what is implemented now, not a request to invent extra features or rewrite the website. Preserve the supplied logos, nineteen tools, canonical paths, processing safeguards, existing content and advertising placeholders unless I explicitly request a change.

Read every section before proposing work. The page transcripts below contain the current copy in page order, followed by form defaults, internal links and exact rendered structured data. The shared header and footer are recorded once and apply to all pages. Static transcripts describe the initial state; the behavior section records important states that appear only after interaction. Do not treat initial disabled controls in static HTML as permanently unavailable: they become enabled after client initialization.

Distinguish implemented features from Coming Soon, placeholder advertisements from active advertising, configured email links from mailbox provisioning, and source configuration from a verified public deployment. Competitor facts reflect the stated checked date and must be rechecked before future updates.
''')
emit('## 1. Product, brand, design and implementation')
emit('''
- Product: Zipora. Tagline: Your files. Done in a flash.
- Purpose: free PDF, image and QR tasks in a modern browser, without account creation or a paid plan.
- Configured default public URL: https://zipora.online. Contact: contact@zipora.online. Both support build-time environment overrides. This snapshot does not establish that hosting or the email mailbox is working.
- Live catalog: 19 tool pages = 9 PDF + 9 image + 1 QR generator. Target-size variants count as distinct tool pages, not separate processing engines.
- Coming Soon only: standalone Remove Background and Watermark Remover. Passport Photo Maker has limited on-device person-background replacement; that is not a released general background-removal tool.
- Supplied logo assets: /logo.png, /wordmark.png; icon and Apple icon generated from the supplied ribbon-Z asset. Do not redraw or replace the user's supplied assets.
- Accent #2563EB; darker accent #1D4ED8; primary text #20242B; secondary #515965; muted #656E7B; border #E1E4E9; white surfaces; quiet surface #F7F8FA; dark footer #171C24.
- Typography: Segoe UI, Arial, sans-serif; mostly weights 400/500. Desktop hero headline 56px, small-phone hero 40px. Desktop tool H1 42px, phone 32px. Normal body 16px.
- Direction: brisk, clear, dependable; paper-white document workspace. Homepage uses a split layout with a coded PDF-merging example and blue finished-file panel. Mobile stacks in reading order.
- Desktop tool directory: three columns; tablet: two; phones: one-column compact rows. Descriptions remain visible without ellipsis. Header is compact, with no navbar search. The homepage hero search filters the catalog.
- Tool workspace: primary panel plus desktop final-file sidebar. The final-file summary is hidden below 700px; processing controls and downloads remain available. Mobile portrait framing remains visible for Passport Photo Maker.
- Page entry: all internal page links without an intentional section hash reset to the top, including same-page footer links. Logo/wordmark opens home at the top. Section links such as /#tools and #how-it-works retain their anchor behavior.
- Ad boxes are labelled Advertisement placeholders, with no active AdSense script, publisher ID, tracking or monetization configured. Tool placement: small ad above H1, sidebar ad below summary, ad after completed download area, bottom ad after FAQ. Blog: one below index intro or article table, and the shared bottom ad.
- Motion: short hover/press/feedback transitions; no decorative looping. Reduced-motion settings are respected. Visible keyboard focus and labelled controls are present.
- Stack: Next.js 16.4.5, React 19, TypeScript, Tailwind CSS 4 plus shared CSS, Lucide, pdf-lib, PDF.js, browser Canvas, JSZip, qrcode and locally served MediaPipe segmentation resources. Runtime file processing happens in the browser; no file-processing backend is required. A static host still serves the website and assets.
- Build: output export, trailingSlash true, Webpack production build. npm install; npm run dev (binds 0.0.0.0 for same-Wi-Fi access); npm run build; deploy out/. PDF.js resources are copied locally before dev/build. No runtime CDN is required for those resources.
''')
emit('## 2. Global SEO, AEO and crawl configuration')
emit('''
- Document language: en. Root HTML id: top.
- metadataBase default: https://zipora.online.
- Root title: Zipora — Free Online PDF & Image Tools, No Signup.
- Root description: Free browser-based PDF, image and QR tools. No signup, no file uploads and no output watermarks.
- Each canonical tool has its own title, description, H1, related links, How to use steps, FAQs and absolute canonical URL. Titles/descriptions below are extracted from rendered HTML, not proposed replacements.
- Home includes Organization JSON-LD.
- Tools include a JSON-LD graph: SoftwareApplication (UtilitiesApplication, browser OS, price 0 USD), HowTo, FAQPage and BreadcrumbList. Visible tool breadcrumbs are absent even though breadcrumb schema remains.
- Existing comparison pages include FAQPage JSON-LD. They are not duplicate blog articles.
- Ten blog articles include unique title/description/canonical, article Open Graph fields, Article JSON-LD with datePublished/dateModified 2026-11-08, organization publisher, source citations, and FAQPage matching the visible FAQ answers. No invented author, review, rating or testimonial is supplied.
- Blog-index title: Zipora Blog — Free PDF & Image Tools, Compared. Twelve cards link to ten /blog/ articles and two existing /compare/ pages. Reading estimates are displayed.
- robots.txt permits * plus GPTBot, ClaudeBot, PerplexityBot and Google-Extended. It references the sitemap.
- Sitemap contains 37 URLs: home, nineteen canonical tools, two existing comparisons, four company pages, blog index and ten articles. The /compare/ index exists but is not currently listed in the sitemap.
- llms.txt describes live tools, comparisons, blog articles, practical limits and company links.
- Aliases: /image-resizer/ renders Resize Image with canonical /resize-image/; /pdf-compressor/ renders Compress PDF with canonical /compress-pdf/. These aliases are not nineteen-tool additions.
- Error outputs: /404.html, /404/ and /_not-found/ share the not-found experience. Treat them as helper/error pages, not normal indexable content.
- Do not infer Twitter cards, a site-wide social preview image, meta-keywords tags, hreflang, an author identity, analytics, Search Console verification, actual search rankings or rich-result eligibility if absent from the rendered metadata below. Structured data and bot permissions do not guarantee indexing, citations or AdSense approval.
''')
emit('## 3. Shared header and footer, in displayed order')
home=soup_for('/')
emit('### Header')
render(home.select_one('header.site-header'))
emit('Logo image: /logo.png. Wordmark image: /wordmark.png (alt: Zipora). The brand link is /#top. Mobile menu has Open navigation / Close navigation labels.')
emit('\n### Footer (preceded by the shared bottom Advertisement box)')
render(home.select_one('footer.zipora-footer'))
emit('\n### Tool catalog and homepage cards')
for tool in DATA['siteTools']:
    emit(f'- {tool["group"]} | {tool["name"]} | /{tool["slug"]}/ | {tool["cardDescription"]}')

emit('\n## 4. Actual processing behavior, defaults and result states')
behavior={
'merge-pdf':'Select at least two valid unlocked PDFs, 200 MB combined maximum. Add by picker or drag/drop, remove or clear, rearrange whole documents with arrows, set output filename, merge by copying PDF pages, and download one PDF. Internal page order and dimensions are retained; bookmarks, interactive features and signatures may change. Changing inputs/order invalidates the previous result. Singular/plural page/file counts are supported.',
'split-pdf':'One unlocked PDF. Modes: ranges (custom comma-separated ranges or fixed page groups), selected/all page extraction (optional combine into one PDF), or maximum-size splitting in KB/MB. Default mode ranges/custom; initial range and group count 1; filename zipora-split; size default 1 MB. Size mode checks actual serialized output; it does not compress images. Up to 10,000 source/selected pages, 200 output PDFs and 200 MB combined output. Download individual PDFs and/or a ZIP. A single page that exceeds a size target produces guidance instead of an invalid split.',
'compress-pdf':'Default Balanced · keep selectable text. Optimize structure also preserves text. Explicit Strong uses image-based compression only with a text/selectability/links/forms/attachments/signature-loss warning. Image-based compression stays at minimum 150 DPI; it never uses 36 or 58 DPI. Compare actual candidate byte sizes and keep the smallest of candidates/original. Never return a larger PDF. If no reduction exists, say so and label Download original PDF. Input maximum 200 MB; raster workflow up to 150 pages. Output filename zipora-compressed.',
'jpg-to-pdf':'Accept JPG/JPEG and PNG, combined input 200 MB and maximum 40 megapixels per image. Reorder with arrows; output one PDF, one page per image. Page size choices A4 portrait (default), US Letter portrait and original image size. Margins none/24pt(default)/48pt, disabled for original size. Fit without crop/stretch. Original-size mode uses one image pixel per PDF point, not a guaranteed photo print dimension. EXIF rotation is not applied. Default filename zipora-images.',
'pdf-to-jpg':'Render full pages, not embedded-photo extraction. Up to 150 pages and 200 MB input; 200 MB generated-image budget; cap each page at 16 megapixels/8192px per side. Resolution options 72/144(default)/216 DPI. JPEG quality 70/92(default)/100%. White background. One-page document downloads as JPG; multiple pages have Download all JPGs ZIP plus individual page downloads. Show the first 6 smaller previews by default, expandable with Show all N pages and collapsible with Show first 6 pages. ZIP always includes all converted pages.',
'pdf-to-png':'Render every page to PNG with Standard/High/Print resolution choices; default scale 2 (144 DPI). White backgrounds. Single-page direct PNG, multipage numbered PNG ZIP; first-page preview. Same 150-page, 200 MB input/output, 16 megapixel/8192px page-rendering protections.',
'image-compressor':'Accept up to 20 JPG/PNG/WebP images, 100 MB batch, 50 MB per source, maximum 40 megapixels. Default output JPG; quality 80%, not 100%. JPG/PNG/WebP output choices; lossy quality controls apply to JPG/WebP. PNG retains alpha; JPG fills transparency white. Compare encoded bytes with each original. If a result is bigger, do not offer that larger result: This quality makes the file bigger than the original. Try 80% or lower. Download one image or a ZIP for multiple outputs.',
'resize-image':'One JPG/PNG/WebP. Source maximum 50 MB and 40 megapixels. Width/height whole numbers 1–8192; output at most 16 megapixels. Initial dimensions 1200×800 before source selection, then source-based dimensions. Aspect ratio enabled by default. Empty number fields are supported during editing and leading zeros normalize (2000, not 02000). Unlocking ratio stretches rather than crops. JPG/PNG/WebP outputs; default JPG/80%. Enlargement cannot recover lost detail.',
'passport-photo-maker':'One portrait, no acceptance guarantee. Presets 35×45 mm(default), 2×2 inches and custom 10–100 mm. Adjust zoom and horizontal/vertical framing. Export 300-DPI JPG with density metadata or a 4×6 inch print sheet. Optional white background replacement uses on-device person segmentation and permits restoring the original; background processing capped at 2048px longest side. Inspect hair/edges and follow authority requirements. The general Remove Background product is still Coming Soon.',
'png-to-jpg':'Batch conversion of PNG to JPG. Transparent pixels become white. Review encoded size and output pixels; conversion is not lossless restoration. One output downloads directly; multiple outputs use ZIP. General image batch/source/memory protections apply.',
'jpg-to-png':'Batch JPG/JPEG to PNG. PNG stores the decoded pixels losslessly but cannot restore detail already lost through JPEG. Output can be larger. One PNG or a ZIP; general image batch/source/memory protections apply.',
'qr-code-generator':'Generate a static QR code from a URL or text locally. Maximum 2000 characters. Default PNG, 512px, error correction M; SVG is available. Error-correction choices L/M/Q/H. Download the generated code; no dynamic destination editing, campaign analytics or managed tracking is implemented. Scan-test before use.',
}
for n in [20,50,100,200]:
    behavior[f'compress-image-to-{n}kb']=f'Default target {n} KB (1 KB=1024 bytes), editable target. Create JPG output, reducing quality and dimensions as required; transparent areas become white. This is a byte-size task and can reduce visible detail. Review actual size and image before downloading. General image batch, source and pixel limits apply. Multiple outputs use ZIP.'
for n in [100,200,500]:
    behavior[f'compress-pdf-to-{n}kb']=f'Default target {n} KB (1 KB=1024 bytes), editable target. Allow image-based compression is checked by default on all three preset pages. Structural candidates are compared; image candidates remain at minimum 150 DPI. No 36/58-DPI unreadable output is created. Size targets are not guaranteed. If raster is disabled and the target is missed: Target not reached. Tick Allow image-based compression to try to reach this size, or try a larger target. If readable image output misses the target: Target not reached at readable quality. Best readable result is X KB at 150 DPI. A text-preserving best-result variation is used when applicable. UI says Best available result instead of pretending the target was reached. Never enlarge the PDF.'
for tool in DATA['siteTools']:
    emit(f'### {tool["name"]} — /{tool["slug"]}/\n{behavior[tool["slug"]]}\n')
emit('''
Shared interaction details: validate selected files; show explicit errors; disable conflicting controls while processing; display progress where implemented; invalidate stale downloads after source/options change; revoke Blob URLs when results change or components unmount. Download buttons use the supplied animation and say Download started because browser save completion is not observable. Repeat downloads remain possible. No files are emailed automatically or sent to a processing endpoint.

Known as-built copy differences (recorded, not silently rewritten in this prompt):
1. Some existing Compress PDF FAQ text says Balanced also tries page images. The current processor/default UI uses Balanced to preserve selectable text; explicit Strong is image-based.
2. Some PDF-to-JPG FAQ text describes one download control. Current behavior includes the main complete ZIP plus individual page downloads and six initially visible thumbnails.
3. The Contact page's When reporting an issue paragraph still begins When contact becomes available. It was deliberately left unchanged at the user's request despite the new public email above it.
4. Unrelated remove.bg quick-comparison copy was removed from the seven specifically requested image pages. Some other non-PDF tool pages still render the shared remove.bg quick comparison. The transcripts below show exactly where it remains; do not assume every card/table has been reclassified.
''')

def page_section(path,label):
    soup=soup_for(path)
    emit('\n'+'='*80+'\n')
    emit(f'## {label} — {path}')
    emit('### Rendered SEO and metadata')
    emit('HTML title: '+(soup.title.get_text() if soup.title else '(none)'))
    for meta in soup.select('meta'):
        attrs={k:v for k,v in meta.attrs.items()}
        emit('- '+json.dumps(attrs,ensure_ascii=False))
    for link in soup.select('link[rel]'):
        if any(r in ['canonical','icon','apple-touch-icon','manifest','alternate'] for r in link.get('rel',[])):
            emit('- Link: '+json.dumps(link.attrs,ensure_ascii=False))
    emit('### Full page body copy, in order (shared chrome recorded above)')
    main=soup.find('main')
    if main: render(main)
    else: emit('(No main element in this output.)')
    controls=main.select('input,select,textarea') if main else []
    if controls:
        emit('\n### Initial form controls and defaults')
        for el in controls:
            record={'element':el.name,**el.attrs}
            for k in ['class','style']: record.pop(k,None)
            if el.name=='select':
                options=[{'value':o.get('value',o.get_text()),'label':clean(o.get_text(' ',strip=True)),'selected':o.has_attr('selected')} for o in el.find_all('option')]
                record['options']=options
                record['selectedValue']=next((o['value'] for o in options if o['selected']),options[0]['value'] if options else None)
            if el.name=='textarea': record['value']=el.get_text()
            emit(json.dumps(record,ensure_ascii=False))
    if main:
        emit('\n### Complete page link inventory')
        for a in main.select('a[href]'): emit(f'- {clean(a.get_text(" ",strip=True)) or a.get("aria-label", "(unnamed)")} -> {a["href"]}')
        ads=main.select('[data-ad-slot]')
        emit('Page-body ad slots: '+(', '.join(a['data-ad-slot'] for a in ads) or 'none')+'. Shared footer ad is additional.')
    schemas=soup.select('script[type="application/ld+json"]')
    emit('\n### Exact rendered JSON-LD')
    if not schemas: emit('No page-specific JSON-LD is emitted here.')
    for schema in schemas:
        emit('```json\n'+json.dumps(json.loads(schema.string or schema.get_text()),indent=2,ensure_ascii=False)+'\n```')

emit('\n## 5. Complete homepage and nineteen canonical tool pages')
page_section('/','Homepage')
for i,tool in enumerate(DATA['siteTools'],1): page_section('/'+tool['slug']+'/',f'Tool {i}/19: {tool["name"]}')
emit('\n## 6. Existing comparison pages and comparison index')
page_section('/compare/','Comparison index')
for item in DATA['comparisons']: page_section('/compare/'+item['slug']+'/',item['h1'])
emit('\n## 7. Blog index and ten full comparison articles')
page_section('/blog/','Blog index')
for i,post in enumerate(DATA['blogPosts'],1):
    emit(f'\nBlog {i}/10 primary target phrase: {post["keyword"]}. This is editorial intent, not an HTML meta-keywords tag.')
    page_section('/blog/'+post['slug']+'/',f'Blog {i}/10: {post["h1"]}')
emit('\n## 8. Company pages, contact and legal content')
for path,label in [('/about/','About'),('/contact/','Contact'),('/privacy-policy/','Privacy Policy'),('/terms/','Terms of Use')]: page_section(path,label)
emit('\n## 9. Compatibility routes and not-found page')
for path,label in [('/image-resizer/','Resize Image compatibility alias'),('/pdf-compressor/','Compress PDF compatibility alias'),('/404.html','Not-found page')]: page_section(path,label)

emit('\n## 10. Complete indexing and machine-readable files')
for name in ['robots.txt','sitemap.xml','llms.txt']:
    emit(f'\n### /{name}\n```'+('xml' if name.endswith('.xml') else 'text'))
    emit((OUT/name).read_text(encoding='utf-8').strip()); emit('```')
emit('\n## 11. Source organization, setup and verification')
emit('''
- src/app/page.tsx: homepage. src/app/layout.tsx: global metadata/provider/scroll component.
- src/lib/site-content.ts: canonical tool metadata, visible intro, short card descriptions, How to use steps, FAQs and related tool mappings.
- src/components/tool-sections.tsx: shared tool intros, related links, steps, quick comparison, FAQ and schema.
- src/components/merge-tool.tsx, split-tool.tsx, conversion-tool.tsx and extra-tool.tsx: real processing workspaces.
- src/lib/pdf.ts, split-pdf.ts, conversions.ts, image-processing.ts, portrait-background.ts: actual processing logic and safeguards.
- src/components/site-chrome.tsx: header/footer and ad placeholders. tool-route-scroll.tsx: page-entry scrolling. tool-search.tsx and tool-directory.tsx: homepage search/catalog.
- src/lib/blog.ts and src/app/blog/[slug]/page.tsx: ten article datasets, static generation, metadata, sources, Article/FAQ schemas and task-specific calls to action. src/app/blog/page.tsx: twelve-card index.
- src/lib/comparisons.ts and src/components/comparison-page.tsx: original two comparisons.
- src/components/company-page.tsx: About/Contact/Privacy/Terms. src/lib/site-url.ts: production URL and email defaults.
- src/app/sitemap.ts, robots.ts and llms.txt/route.ts: indexing outputs.
- src/app/globals.css and polish.css: styling. public/: logos, wordmark, PDF.js and model assets.
- Setup: npm install; npm run dev. Open localhost:3000 locally. For phones on the same Wi-Fi use the computer's LAN IPv4 and port 3000; firewall/network configuration must allow the connection.
- Production: npm run build. Publish the complete out/ directory on a static host. For a local preview: python -m http.server 4173 --bind 127.0.0.1 --directory out. Do not use next start for this static export.
- Optional build-time variables: NEXT_PUBLIC_SITE_URL=https://zipora.online and NEXT_PUBLIC_CONTACT_EMAIL=contact@zipora.online.
- Checks: npm test; npm run typecheck; npm run test:e2e. Windows browser checks use installed Edge. Set E2E_BASE_URL when testing an existing preview.
- Latest focused verification: build passed; twelve browser tests passed covering editorial pages, footer scrolling at 1440/768/390px and merge regression; all ten blog articles and their schemas/actions checked; export internal-link audit found zero missing page links. Those results are scoped checks, not a claim that every dependency or future browser has been exhaustively tested.
- Supporting reports: research/BLOG-CONTACT-NAVIGATION-UPDATE.md, blog-source-register.json, blog-source-checks.json, blog-export-link-audit.json, UNSLOP-DESIGN-REFRESH.md and PDF-QUALITY-FIX.md.
- Competitor claims reflect the checked date, not a future guarantee. Some bulk reader checks were rate-limited; individual official pages were also read. The requested iLovePDF India price example was supplied by the user; the fetched unlocalized pricing page did not expose that regional figure. Unpublished rules remain explicitly qualified.
- Design direction informed by Unslop by Damir Sokolovsky (@heydamir), CC BY 4.0. Supplied component licensing notices remain in the source.

When acting on this prompt, first distinguish a request for explanation from a request to edit. Do not rebuild working tools, invent features, claim Coming Soon tools are live, fabricate competitor facts, publish changes, create a mailbox or send emails merely because they are described in this inventory. Preserve existing page URLs and source files unless explicitly asked otherwise.

END OF COMPLETE ZIPORA WEBSITE PROMPT
''')

target=ROOT/'Zipora-Complete-Website-Prompt.txt'
text='\n'.join(lines)+'\n'
target.write_text(text,encoding='utf-8')
print(json.dumps({'file':str(target),'characters':len(text),'words':len(text.split()),'canonicalTools':len(DATA['siteTools']),'blogArticles':len(DATA['blogPosts'])},indent=2))

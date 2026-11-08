# Zipora

Free, browser-based PDF, image and QR tools. No accounts, uploads, database, or processing API.

## Run locally

Requires Node.js 20.19+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000/ . `npm run dev` listens on all network interfaces. To use a phone, connect both devices to the same Wi-Fi and open `http://<computer-Wi-Fi-IP>:3000/`. Find that address with `ipconfig`. Allow Node.js on private networks if Windows prompts. Keep the computer and development server running. Restart an existing dev server after dependency changes.

## Working tools

| URL | What it does |
| --- | --- |
| `/merge-pdf/` | Arrange unlocked PDFs and merge all pages into one document. |
| `/split-pdf/` | Split custom/fixed ranges, extract pages, or create size-limited PDFs; download parts or a ZIP. |
| `/compress-pdf/` | Optimize PDF structure, or explicitly rasterize pages for stronger compression. |
| `/jpg-to-pdf/` | Order JPG/PNG images and create A4, Letter, or original-size PDF pages. |
| `/pdf-to-jpg/` | Render PDF pages to JPGs; one button downloads a JPG for one page or a ZIP for multiple pages. |

`/pdf-compressor/` is an alias for the compressor. All 19 tools are linked from the homepage and footer. Uploads support browse and drag-and-drop. Results are invalidated when files or processing options change. The original PDF workflows have editable output filenames; additional tools generate safe numbered filenames. Original files are never overwritten.

## Image, QR and photo tools

- `/image-compressor/`: batch JPG/PNG/WebP output, default 80% quality, and rejection of any output larger than its source.
- `/resize-image/`: exact pixel dimensions, optional aspect-ratio lock, JPG/PNG/WebP output.
- `/compress-image-to-20kb/`, `/compress-image-to-50kb/`, `/compress-image-to-100kb/`, `/compress-image-to-200kb/`: actual-byte target JPEG compression; quality and dimensions may decrease. 1 KB = 1024 bytes.
- `/compress-pdf-to-100kb/`, `/compress-pdf-to-200kb/`, `/compress-pdf-to-500kb/`: text-preserving optimization and optional raster compression. Reports target misses; never returns a larger file. Raster output loses text, links, forms and signatures and stays at 150 DPI.
- `/png-to-jpg/`, `/jpg-to-png/`: batch format conversion with one direct download or one ZIP. JPG uses a white matte; PNG cannot restore lost detail.
- `/pdf-to-png/`: local PDF page rendering, one PNG or a ZIP of numbered pages.
- `/qr-code-generator/`: static text/URL QR codes, error correction, PNG/SVG, no tracking or expiry.
- `/passport-photo-maker/`: manual framing, 35×45 mm / 2×2 inch / custom dimensions, 300 DPI JPEG, 4×6 inch print sheet, optional local white-background replacement. No automated compliance/face validation or guarantee of official acceptance. Inspect hair and edges.

Images: up to 20 files and 100 MB combined, 50 MB / 40 megapixels per input. Output maximum 16 megapixels and 8192 pixels per side. Animated WebP uses its first frame. Portrait background processing downsizes to at most 2048 pixels on the longest side. PDFs: 200 MB and up to 150 pages for rendering. Generated outputs capped at 200 MB; low-memory phones may need smaller batches.

The passport model is bundled at `public/portrait/selfie_segmenter.tflite` from Google's official MediaPipe model distribution. Matching runtime WASM files are copied by predev/prebuild. Nothing loads from third-party CDNs at runtime. Keep `public/portrait/` in source and the complete `out/portrait/` in deployment. MediaPipe uses CPU inference; the first background action loads about 10 MB of WASM. Failure leaves the original photo available.

## Zipora branding, discovery and deployment settings

All 19 tool pages retain their existing upload, processing and real-download flows. The shared presentation adds a consistent Zipora logo, live hero search and compact navigation, grouped catalog, tool-specific instructions/FAQs, related links, factual comparisons, company pages, and ad placeholders. The hero uses solid #2563EB, a black headline and white supporting text; warm gradients are removed. Tool pages stay white. Unslop by Damir Sokolovsky (CC BY 4.0) informed the spacing, typography, color and motion; the latest user request replaces the former hero gradient with a quiet surface.

Canonical resizer URL: `/resize-image/`. Existing `/image-resizer/` and `/pdf-compressor/` URLs remain functional aliases with canonical links. Two comparison pages are `/compare/zipora-vs-ilovepdf/` and `/compare/zipora-vs-removebg/`; later comparisons and general background/watermark removal have not been built. Competitor facts are dated 7 November 2026 and link to official sources.

After buying a domain, copy `.env.example` to `.env.local` and set:

```text
# Canonical origin: https://www.zipora.online (src/lib/site-url.ts)
NEXT_PUBLIC_CONTACT_EMAIL=your-real-public-contact-address
```

Replace those illustrative values with the actual domain and email, then rebuild. In Vercel, set the same variables in Project Settings before deployment. Without a site URL, local previews use `http://localhost:3000` in sitemap/schema/canonicals. No unowned production domain is assumed. Without an email, Contact explicitly says coming soon and has no fake mail link or submit form.

The static build emits `sitemap.xml`, `robots.txt` and `llms.txt`. Sitemap includes home, nineteen canonical tools, two comparisons, four company pages, the blog index and ten blog articles. Robots permits general and named AI crawlers. Each tool has distinct title/description/H1 and visible FAQ/HowTo content matched by JSON-LD. Structured data and crawl files do not guarantee ranking, rich results or AdSense approval. Ad placeholders contain only the requested HTML comment, no publisher ID or ad script.

The custom error page exports as `out/404.html`. Vercel/static hosts must serve it for unknown URLs; the generic Python HTTP preview returns its own error response for an unknown path, so open `/404.html` to inspect the custom page there.

## Production and static hosting

```sh
npm run build
```

Deploy the generated `out/` directory to a static host, or use Vercel's Next.js preset with this build command. No server functions or environment variables are required. This project uses Webpack for production because Turbopack's CSS worker failed in the tested Windows environment.

For a production preview with Python installed:

```sh
python -m http.server 4173 --bind 127.0.0.1 --directory out
```

Open http://127.0.0.1:4173/ . `next start` is not used with static exports.

## PDF rendering resources

`npm run dev` and `npm run build` automatically run `scripts/copy-pdfjs.mjs`. It copies the installed PDF.js worker, standard fonts, character maps, WASM resources, and license into `public/pdfjs/`. The static export includes these files. Worker and library versions stay matched, with no runtime CDN dependency. Keep the entire `out/` directory when deploying.

## Interaction and motion

File order controls use short positional animations. Results, errors, tabs, FAQs, and buttons have restrained feedback transitions. The site respects reduced-motion preferences and introduces no artificial processing delays. The merge hint is simply "Use the arrows to rearrange."

## Checks

```sh
npm test
npm run typecheck
npm run test:e2e
```

Browser tests use installed Microsoft Edge on Windows. On other platforms install Chromium once with `npx playwright install chromium`. They generate synthetic PDFs and use synthetic JPG/PNG/encrypted-PDF fixtures; no personal documents are involved. Tests inspect actual downloaded PDF dimensions/page order, JPEG pixels and signatures, and ZIP entries.

To test an existing production preview in PowerShell:

```powershell
$env:E2E_BASE_URL = 'http://127.0.0.1:4173'
npm run test:e2e
Remove-Item Env:E2E_BASE_URL
```

## Processing limits

- Splitting supports up to 10,000 source/selected pages, 200 output PDFs, and 200 MB of combined output. Size mode checks real serialized bytes; if one page cannot fit, increase the limit or compress the source first. It does not automatically compress pages. Premium Smart splitting and cloud-drive imports are outside this implementation.

- Original PDF workflows support 200 MB input per queue. New image tools support 100 MB batches and 50 MB per image. There is no daily usage counter; device memory can require smaller batches.
- JPG-to-PDF accepts JPG/PNG only, up to 40 megapixels per image. Images fit without cropping. Original-size mode uses one image pixel per PDF point. EXIF rotation tags are not applied; rotate images first if needed. HEIC is unsupported. WebP is supported in the new image workspaces, but not JPG-to-PDF.
- PDF rendering supports up to 150 pages and caps each page at 16 megapixels and 8192 pixels on either side. JPEG output is capped at 200 MB before ZIP packaging.
- Structural optimization compares object-stream rewriting with a cleaned page-tree rebuild. Selectable text and page visuals are retained, but bookmarks, forms, metadata, and signatures may change. The smallest of these candidates and the original is kept. Savings are not guaranteed.
- Balanced and Optimize preserve text through structural optimization. Explicit Strong compression tries JPEG qualities at a fixed minimum 150 DPI, then compares the visual copy with the structural result and original. Output is never larger than the input. If no reduction is possible, the UI says so and offers the unchanged original. When an image-based version wins, selectable text, links, forms, attachments, bookmarks, and signatures are lost; the interface explains this before processing. Generated image-based compression never drops below 150 DPI.
- PDFs must be valid and unlocked. Merging/rewriting can invalidate signatures; inspect important outputs. Page rendering uses white backgrounds for JPG output.

All processing occurs on the device. Blob URLs are revoked when results change or components unmount. Saved downloads remain on the user's device. There are no active ads, telemetry, cookies, or upload endpoints. Labelled Advertisement placeholders stay separate from controls. About, Contact, Privacy Policy and Terms pages are included; the Contact page and footer publish contact@zipora.online.

## Source map

Download actions use the supplied animated `src/components/buttons/download-button.tsx`, adapted for real Blob URLs and filenames. Its green feedback says "Download started" because browsers cannot confirm the user's final save. There is no simulated download-completion timer, and repeat downloads remain available. `src/lib/cn.ts` provides the shared clsx/tailwind-merge helper.

- `src/lib/pdf.ts`: PDF validation, merging, filenames and shared input limit.
- `src/lib/split-pdf.ts`: validated split plans, page copying, size limits, and PDF ZIPs.
- `src/components/split-tool.tsx`: split ranges, page selection, progress, cancellation and downloads.
- `src/lib/conversions.ts`: image-to-PDF, structural optimization, PDF.js rendering, image compression, ZIP generation.
- `src/components/merge-tool.tsx`: merge workflow.
- `src/components/conversion-tool.tsx`: three conversion workflows and result lifecycle.
- `src/components/site-chrome.tsx`: shared header, footer, dormant ad containers.
- `src/lib/tool-catalog.ts`: homepage and footer tool links.
- `src/lib/extra-tools.ts`, `src/components/extra-tool.tsx`: fourteen additional image/QR/photo/PDF preset pages.
- `src/lib/image-processing.ts`: validated canvas rendering, byte-target JPEGs and 300 DPI photo crops/print sheets.
- `src/lib/portrait-background.ts`: local person segmentation and white background compositing.
- `src/components/tool-directory.tsx`: homepage categories and search.
- `src/lib/conversion-config.ts`: tool-specific copy, instructions and FAQs.
- `tests/`: PDF-content and browser tests.
- `research/`: REA captures, implementation findings, verification notes and screenshots.

## Design and investigation


The interface uses [Unslop by Damir Sokolovsky](https://github.com/heydamir/unslop), CC BY 4.0, with Zipora's approved graphite/white/blue document-workspace direction. See `research/ZIPORA-PLAN.md` and `research/ZIPORA-VERIFICATION.md`.

The reference websites were inspected with REA. Historical raw evidence remains in the original workspace’s `research/` directory; the delivery archive includes current Zipora reports and official comparison sources only. None of that third-party source is imported or served by the app. Some public dependency versions were observable; unseen backend details remain unknown. Current comparison sources are linked from the comparison pages and retained in the research text files. The public canonical origin is https://www.zipora.online. No hosting deployment or email mailbox was created by these source changes.


## Latest layout fixes

The header is 64px on desktop and compact on phones, with no navbar search. Hero search still filters the nineteen-tool catalog. Tool-card descriptions use separate short copy that fits fully on one line, without truncation, while SEO descriptions retain their detail.

Every tool page removes breadcrumbs and What next, places Related Tools above How to use, and uses a small top ad above the H1 plus a sidebar ad below the desktop summary. A third tool-area ad appears below a completed result/download box. The existing bottom ad after FAQ stays unchanged. Ads are labelled placeholders only. Mobile hides the summary panel, not the tool or its downloads; portrait framing stays available in the mobile workspace. Compress PDF starts with Balanced compression, with all three methods still selectable.


## PDF quality fix

Balanced is the default on Compress PDF and keeps real selectable text. Strong is explicitly image-based, with the text-loss warning, and never generates page images below 150 DPI. All three target PDF presets enable image-based attempts initially, maintain 150 DPI, and give a clear readable-quality miss when a requested size is impossible. If a text-preserving copy is smallest, it stays text-preserving and is labelled accordingly. No target is reached by silently sacrificing resolution.

PDF-to-JPG shows six smaller previews initially, with expand/collapse and per-page JPG downloads. The main ZIP includes every page. Singular count labels are corrected. Run `node scripts/create-pdf-regression-fixture.mjs` if the synthetic fixture needs regeneration; after browser tests, `python scripts/verify-pdf-quality.py` independently checks the saved PDF downloads (requires pypdf and PyMuPDF; uses Poppler for rendering when available). See `research/PDF-QUALITY-FIX.md` for evidence and the protected-file scope.


## Blog and public contact

`/blog/` lists twelve comparisons: ten articles under `/blog/` and the two existing `/compare/` pages. Post data, official sources, checked dates and tool links live in `src/lib/blog.ts`. Posts export as static HTML with unique metadata, Article and visible-matching FAQPage schemas. Re-check official sources before changing facts or advancing a checked date; never reuse a price across regions or infer an unpublished allowance.

The canonical origin is fixed to `https://www.zipora.online` in `src/lib/site-url.ts`, matching the www production host. `NEXT_PUBLIC_SITE_URL` is no longer used, preventing an old apex-domain override from changing production canonicals. The public email defaults to `contact@zipora.online`; `NEXT_PUBLIC_CONTACT_EMAIL` can override it at build time. Rebuild after changing the contact value. Mailto links open the visitor's email application; hosting the site does not create or verify that mailbox.

The shared route scroll component resets page entry and same-page links to the top, including links from the footer. Explicit anchors such as `/#tools` retain their section behavior. The nineteen processing tools were not rebuilt or given new URLs.

Focused verification: `npx playwright test tests/browser/editorial-blog.spec.ts tests/browser/merge.spec.ts`. For a static preview set `E2E_BASE_URL` as described above. See `research/BLOG-CONTACT-NAVIGATION-UPDATE.md` for scope and source-verification notes.

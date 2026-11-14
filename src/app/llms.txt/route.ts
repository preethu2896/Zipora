import { removeBgArticle } from '@/lib/remove-bg-article';
import { blogPosts, checkedDate } from '@/lib/blog';
import { siteTools } from '@/lib/site-content';
import { absoluteUrl, contactEmail } from '@/lib/site-url';
export const dynamic = 'force-static';

export function GET() {
  const text = [
    '# Zipora', '',
    '> Zipora offers 41 free browser-based PDF, image, QR, JSON, favicon, text, URL and UUID tools. No signup or payment is required. Selected file contents are processed on the visitor’s device, not uploaded to a processing server.', '',
    `Canonical website: ${absoluteUrl('/')}`,
    'Website assets, PDF rendering resources and the optional portrait model are downloaded from the host. This is separate from uploading a selected file.', '',
    '## Live tools',
    ...siteTools.map(t => `- [${t.name}](${absoluteUrl(`/${t.slug}/`)}): ${t.description}`), '',
    '## Comparisons and educational content',
    `- [Compare file workflows](${absoluteUrl('/compare/')}): Supported tasks, processing and availability.`,
    `- [Zipora vs iLovePDF](${absoluteUrl('/compare/zipora-vs-ilovepdf/')}): Local PDF tasks versus a broader PDF suite.`,
    `- [Zipora vs remove.bg](${absoluteUrl('/compare/zipora-vs-removebg/')}): Image tools and availability; Zipora’s standalone background remover runs locally.`,
    `- [Zipora Blog](${absoluteUrl('/blog/')}): Dated comparisons citing official sources; fact-check date ${checkedDate}. Prices and service terms can change.`,
    `- [${removeBgArticle.heading}](${absoluteUrl(removeBgArticle.path)}): ${removeBgArticle.summary}`,
    ...blogPosts.map(p => `- [${p.h1}](${absoluteUrl(`/blog/${p.slug}/`)}): ${p.summary}`), '',
    '## Scope and limitations',
    'PDF tools include merge, split, rotation, watermarking, page numbering, password protection, compression, JPG/PNG-to-PDF and PDF-page-to-image conversion. Image tools cover compression, cropping, rotation, resizing, JPG/PNG, WebP and HEIC conversion and portrait framing. The QR generator exports static PNG or SVG codes; it does not provide scan analytics or editable redirects.',
    'File, page, pixel and browser-memory limits apply. PDF size targets are not guaranteed. Balanced PDF compression preserves selectable text; Strong can rasterize pages at 150 DPI and lose document features. Image size targets may reduce dimensions. Passport framing and optional local portrait background replacement do not certify official acceptance.',
    'Remove Background is live and exports transparent PNGs locally. Supported Gemini image and video watermark cleanup is available. PDF to Word and PDF to Excel convert PDFs with selectable text. Zipora does not offer OCR or official photo certification.', '',
    '## About, contact and legal information',
    `- [Advertise on Zipora](${absoluteUrl('/advertise/')}): Homepage sponsor frame enquiries.`,
    `- [About Zipora](${absoluteUrl('/about/')}): Identity, supported tasks and local processing.`,
    `- [Contact Zipora](${absoluteUrl('/contact/')}): Tool issues, feedback and corrections.`,
    `- [Email Zipora](mailto:${contactEmail}): Do not send private files or identity documents.`,
    `- [Privacy Policy](${absoluteUrl('/privacy-policy/')}): File processing, website delivery and the current tracker/ad policy.`,
    `- [Security & Privacy](${absoluteUrl('/security-and-privacy/')}): Browser processing, local preferences and hosting logs.`,
    `- [Terms of Use](${absoluteUrl('/terms/')}): Output checks, use and practical limits.`,
    `- [Third-party notices](${absoluteUrl('/third-party-notices.txt')}): Bundled software and asset notices.`, '',
    'This file is a factual navigation aid. It is not a promise of search indexing, rankings or AI citations.', '',
  ].join('\n');
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

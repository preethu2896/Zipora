import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { AdSlot, SiteFooter, SiteHeader } from '@/components/site-chrome';
import { JsonLd } from '@/components/json-ld';
import { breadcrumbSchema, organizationId, pageMetadata, socialImage, webPageSchema } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site-url';
import { removeBgArticle as article } from '@/lib/remove-bg-article';

export const metadata = pageMetadata(article.path, article.title, article.description, {
  publishedTime: article.date,
  modifiedTime: article.date,
});

export default function RemoveBgClosingArticle() {
  const url = absoluteUrl(article.path);
  return <>
    <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
      webPageSchema(article.path, article.heading, article.description),
      breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Blog', path: '/blog/' }, { name: article.heading, path: article.path }]),
      {
        '@type': 'Article', '@id': url + '#article', headline: article.heading, description: article.description,
        datePublished: article.date, dateModified: article.date, mainEntityOfPage: url, image: [socialImage.url],
        author: { '@id': organizationId }, publisher: { '@id': organizationId }, citation: [article.source],
      },
      {
        '@type': 'FAQPage', '@id': url + '#faq',
        mainEntity: article.faqs.map(([name, text]) => ({
          '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text },
        })),
      },
    ] }}/>
    <SiteHeader/>
    <main className="main-shell editorial blog-article">
      <header className="intro"><div><h1>{article.heading}</h1>
        <p>remove.bg’s standalone website ends on 1 December 2026 at 9:00am CET. If you use it, here’s what changes and what to do before then.</p>
      </div></header>
      <p className="review-date">Facts checked <time dateTime={article.date}>13 November 2026</time>. By <Link href="/about/">Zipora</Link>.</p>
      <section className="legal-section">
        <h2>What is closing?</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>The standalone website closes on 1 December at 9:00am CET.</li>
          <li>Self-serve API users are directed to Leonardo.Ai, which charges per image. Existing remove.bg API keys do not carry over.</li>
          <li>Unused pay-as-you-go credits expire on 1 December 2026.</li>
          <li>Monthly plans end automatically. Annual subscribers get a pro-rata refund.</li>
        </ul>
        <p>Before the shutdown, free personal use is limited to low-resolution results up to 0.25 megapixels. Full-resolution downloads require paid credits.</p>
      </section>
      <section className="legal-section">
        <h2>Where background removal moves</h2>
        <p>Background removal moves into Canva. You’ll need a Canva account to use it there. Unlimited removal is part of Canva Pro.</p>
      </section>
      <AdSlot position="blog-table"/>
      <section className="legal-section">
        <h2>What to do before 1 December</h2>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Download any full-resolution results you already made.</li>
          <li>Use your remaining pay-as-you-go credits before they expire.</li>
          <li>Choose your next tool now so you can keep working after the switch.</li>
        </ol>
      </section>
      <section className="legal-section">
        <h2>Remove a background for free on Zipora</h2>
        <p>Zipora’s Remove Background is available now. It’s free and requires no signup or account. Your browser processes the image on your device without uploading it.</p>
        <p>Choose a JPG, PNG or WebP up to 20 MB. The tool exports a transparent PNG at the original dimensions, up to 16 megapixels and 8192 pixels per side.</p>
        <p>Check fine hair, fur and glass in the preview. The first run downloads the model, so use Wi-Fi if you’re watching your data. Later runs reuse the cached model while it remains in your browser.</p>
        <h3>How to use it</h3>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Open Remove Background.</li>
          <li>Choose or drop your image, then select Remove background.</li>
          <li>Check the preview and download the transparent PNG.</li>
        </ol>
      </section>
      <section className="sources">
        <h2>Official sources</h2>
        <ul><li><a href={article.source}>remove.bg migration FAQ<ArrowRight/></a></li></ul>
      </section>
      <section className="faq-section">
        <div><h2>Frequently asked questions</h2></div>
        <div className="faqs">{article.faqs.map(([question, answer]) =>
          <details key={question}><summary>{question}<Plus/></summary><p>{answer}</p></details>,
        )}</div>
      </section>
      <div className="comparison-actions"><Link className="primary" href="/remove-background/">Try Remove Background — Free<ArrowRight/></Link></div>
      <p className="trademark-note">remove.bg is a trademark of its owner. This post is for information only.</p>
    </main>
    <SiteFooter/>
  </>;
}

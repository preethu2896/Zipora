import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Plus } from 'lucide-react';
import { AdSlot, SiteFooter } from '@/components/site-chrome';
import { HomeHeader } from '@/components/home-header';
import { HomeSplitPreview } from '@/components/home-split-preview';
import { JsonLd } from '@/components/json-ld';
import { RecentToolLinks } from '@/components/recent-tool-links';
import ToolDirectory from '@/components/tool-directory';
import { pageMetadata, webPageSchema } from '@/lib/seo';
import { SponsorFrameList } from '@/components/sponsor-frame-list';
import { siteTools, toolInfo } from '@/lib/site-content';

export const metadata = {
  ...pageMetadata('/', 'Zipora — Free Online PDF, Image and QR Tools', 'Explore 42 free PDF, image, video, QR and text tools. Merge, compress and convert files in your browser without signup or file uploads.'),
  title: 'Free Online PDF, Image, Video and QR Tools | Zipora',
};

const recent = ['split-image', 'video-compressor', 'remove-background', 'gemini-watermark-remover'];
const popular = [
  ['merge-pdf', 'Combine PDFs into one.'],
  ['remove-background', 'Make the background transparent.'],
  ['compress-pdf', 'Reduce PDF file size.'],
  ['compress-image-to-20kb', 'Fit an image to a 20 KB limit.'],
  ['video-compressor', 'Save a smaller MP4.'],
  ['image-compressor', 'Reduce image file size.'],
  ['resize-image', 'Set new image dimensions.'],
  ['qr-code-generator', 'Make a downloadable QR code.'],
] as const;

const free = [
  ['remove-background', 'Up to 20 MB in, transparent PNG out. Runs in your browser.'],
  ['video-compressor', 'Up to 100 MB and 5 minutes in, H.264 MP4 out.'],
  ['gemini-watermark-remover', 'Up to 20 MB in, PNG out.'],
  ['gemini-video-watermark-remover', 'Up to 50 MB in, MP4 out.'],
];

const tasks = [
  ['Compress a file', ['compress-pdf-to-100kb', 'compress-image-to-20kb', 'video-compressor']],
  ['Remove a background or mark', ['remove-background', 'gemini-watermark-remover']],
  ['Convert a file', ['jpg-to-pdf', 'png-to-jpg', 'webp-to-jpg', 'heic-to-jpg']],
  ['Edit a PDF', ['merge-pdf', 'split-pdf', 'rotate-pdf', 'protect-pdf']],
  ['Make a QR code', ['qr-code-generator']],
] as const;

const steps = [
  ['Choose a tool', 'Pick any of the 42 tools. No signup needed.'],
  ['Drop your file', 'It processes in your browser. Nothing uploads.'],
  ['Download the result', 'Save the result. Your original stays untouched.'],
];

const questions = [
  ['Do my files leave my device?', 'No. Your files are processed in your browser and never uploaded to a file-processing server.'],
  ['Do I need an account?', 'No. All 42 tools are free to use without signing up.'],
  ['Does Zipora add a watermark?', 'Zipora adds no watermark to your downloads. Watermark PDF lets you add your own text or image when you choose to.'],
  ['Can I use Zipora on my phone?', 'Use a current mobile browser. Large files depend on your device’s memory, and some video tools work best in desktop Chrome or Edge.'],
  ['Will Zipora change my original file?', 'No. Download the result as a separate file.'],
  ['Are there file size limits?', 'Some tools have their own limits. The supported file sizes are shown on the tool page.'],
];

export default function Home() {
  return <div className="zipora-home">
    <a className="skip-link" href="#main">Skip to main content</a>
    <HomeHeader/>
    <div className="home-content">
      <main id="main" className="home-shell-content">
        <section className="home-intro">
          <p className="home-hero-label"><strong>Free</strong> Browser-based file tools</p>
          <h1>Free PDF, Image &amp; <br/><span>Video Tools</span></h1>
          <p>Merge PDFs, edit images, and compress video.<br className="home-hero-break"/> No sign-up or added watermark.</p>
          <div className="home-actions">
            <a className="home-primary" href="#tools">Browse all tools <ArrowRight size={17} aria-hidden="true"/></a>
          </div>
          <HomeSplitPreview/>
        </section>

        <AdSlot position="hero"/>

        <section className="home-block home-featured" aria-labelledby="popular-tools">
          <h2 id="popular-tools">Popular tools</h2>
          <div className="home-popular home-pair-grid">{popular.map(([slug, subtitle]) => <Link href={`/${slug}/`} key={slug}>
            <div className="home-feature-art">
              <img src={`/popular-tools/${slug}.webp`} width={960} height={640} alt="" loading="lazy"/>
            </div>
            <span className="home-feature-caption"><span><strong>{toolInfo(slug).name}</strong><small>{subtitle}</small></span><ArrowUpRight aria-hidden="true"/></span>
          </Link>)}</div>
        </section>

        <SponsorFrameList/>
        <ToolDirectory newest={recent}/>
        <RecentToolLinks tools={siteTools.map(({ slug, name }) => ({ slug, name }))} added={recent}/>

        <section className="home-block">
          <h2>What’s free, tool by tool</h2>
          <div className="home-pair-grid">{free.map(([slug, limit]) => {
            const tool = toolInfo(slug);
            return <article className="home-panel" key={slug}>
              <h3><Link href={`/${slug}/`}>{tool.name}</Link></h3>
              <p>{tool.cardDescription}</p><p><strong>Free:</strong> {limit}</p>
            </article>;
          })}</div>
          <p className="home-section-copy">Every tool is free and processes files on your device. Check individual tools for supported sizes and formats.</p>
        </section>

        <section className="home-block">
          <h2>Popular tasks</h2>
          <div className="home-task-grid">{tasks.map(([title, slugs]) => <section key={title}>
            <h3>{title}</h3>
            <ul>{slugs.map(slug => <li key={slug}><Link href={`/${slug}/`}>{toolInfo(slug).name}</Link></li>)}</ul>
          </section>)}</div>
        </section>

        <section className="home-block" id="how-it-works">
          <h2>How it works</h2>
          <ol className="home-steps">{steps.map(([title, description]) => <li key={title} className="home-panel">
            <h3>{title}</h3><p>{description}</p>
          </li>)}</ol>
        </section>

        <section className="home-block" id="faq">
          <h2 id="faq">Frequently asked questions</h2>
          <div className="home-faq">{questions.map(([question, answer]) => <details key={question}>
            <summary>{question}<Plus size={18} aria-hidden="true"/></summary><p>{answer}</p>
          </details>)}</div>
        </section>

        <section className="home-block home-closing">
          <h2>Ready to get a file done?</h2>
          <a className="home-primary" href="#tools">Browse all tools <ArrowRight size={17} aria-hidden="true"/></a>
        </section>
      </main>
      <SiteFooter textWordmark/>
    </div>
    <JsonLd data={{ '@context': 'https://schema.org', ...webPageSchema('/', 'Zipora — Free PDF, image and QR tools', '42 free browser-based tools for PDFs, images, QR codes and JSON. No signup or file uploads.') }}/>
  </div>;
}

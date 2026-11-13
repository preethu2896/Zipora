import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { AdSlot, SiteFooter } from '@/components/site-chrome';
import { HomeHeader } from '@/components/home-header';
import { HomeCompressionDemo } from '@/components/home-compression-demo';
import { JsonLd } from '@/components/json-ld';
import { RecentToolLinks } from '@/components/recent-tool-links';
import ToolDirectory from '@/components/tool-directory';
import { ToolSearch } from '@/components/tool-search';
import { pageMetadata, webPageSchema } from '@/lib/seo';
import { siteTools } from '@/lib/site-content';
import './home.css';

export const metadata = pageMetadata('/', 'Zipora — Free Online PDF, Image and QR Tools', 'Explore 41 free PDF, image, QR, JSON, favicon and text tools from Zipora. Find the right tool for your task and process files in your browser without signing up.');

const recent = [
  'video-compressor', 'remove-background', 'gemini-video-watermark-remover', 'gemini-watermark-remover',
  'rotate-pdf', 'watermark-pdf', 'add-page-numbers-to-pdf', 'protect-pdf', 'unlock-pdf', 'word-to-pdf',
  'pdf-to-word', 'excel-to-pdf', 'pdf-to-excel', 'crop-image', 'rotate-image', 'heic-to-jpg', 'webp-to-jpg',
  'json-formatter', 'favicon-generator', 'word-counter', 'url-encoder', 'uuid-generator',
];

const popular = [
  ['Merge PDF', 'Combine PDFs into one.', '/merge-pdf/'],
  ['Compress PDF', 'Reduce PDF file size.', '/compress-pdf/'],
  ['Compress Image to 20KB', 'Get a 20KB JPG.', '/compress-image-to-20kb/'],
  ['Image Compressor', 'Reduce image file size.', '/image-compressor/'],
];

const proof = [
  ['Video Compressor', '1.23 MB → 683.76 KB', '44% smaller', '/video-compressor/'],
  ['Remove Background', '71.1% transparent', 'Clean corners on a portrait test', '/remove-background/'],
  ['Compress Image to 20KB', '1.52 MB → 19.57 KB', 'JPEG export', '/compress-image-to-20kb/'],
];

const steps = [
  ['Choose a tool', 'Pick any of the 41 tools. No signup needed.'],
  ['Drop your file', 'It processes in your browser. Nothing uploads.'],
  ['Download the result', 'Save the result. Your original stays untouched.'],
];

const questions = [
  ['Do my files leave my device?', 'No. Your files are processed in your browser and never uploaded to a file-processing server.'],
  ['Do I need an account?', 'No. All 41 tools are free to use without signing up.'],
  ['Does Zipora add a watermark?', 'Zipora adds no watermark to your downloads. Watermark PDF lets you add your own text or image when you choose to.'],
  ['Can I use Zipora on my phone?', 'Use a current mobile browser. Large files depend on your device’s memory, and some video tools work best in desktop Chrome or Edge.'],
];

export default function Home() {
  return <div className="zipora-home">
    <a className="skip-link" href="#main">Skip to tools</a>
    <HomeHeader/>
    <main id="main">
      <section className="home-hero">
        <p className="home-count">41 free tools</p>
        <h1><span>Your files.</span><span>Done in a flash.</span></h1>
        <p className="home-lede">41 free PDF, image and video tools that run in your browser. Files stay in your browser. Nothing uploads.</p>
        <div className="home-hero-actions">
          <a className="home-button home-button-primary" href="#tools">Browse all tools</a>
          <Link className="home-button" href="/remove-background/">Try Remove Background</Link>
        </div>
        <p className="home-trust">Free · No signup · No upload</p>
      </section>

      <div className="home-editorial-shell">
        <section className="home-block" aria-labelledby="playground-heading">
          <div className="home-section-title"><p className="home-kicker">Try it live</p>
            <h2 id="playground-heading">Image compression playground</h2>
          </div>
          <HomeCompressionDemo/>
          <div className="home-demo-caption">
            <a href="https://www.nasa.gov/image-article/blue-marble-image-of-earth-from-apollo-17/">Sample photo by NASA / Apollo 17</a>
            <Link href="/image-compressor/">Try the full Image Compressor <ArrowRight size={16} aria-hidden="true"/></Link>
          </div>
          <div className="home-proof" aria-label="Results from previous Zipora tests">
            {proof.map(([name, result, note, href]) => <Link key={href} href={href}>
              <span>{name}</span><strong>{result}</strong><small>{note}</small>
            </Link>)}
          </div>
        </section>

        <AdSlot position="hero"/>

        <div className="home-block home-tool-area">
          <div className="home-section-title"><p className="home-kicker">All tools</p><h2>Find the tool you need</h2></div>
          <section className="home-popular" aria-labelledby="popular-heading">
            <h3 id="popular-heading">Popular tools</h3>
            <div>{popular.map(([name, description, href]) => <Link key={href} href={href}>
              <strong>{name}</strong><span>{description}</span>
            </Link>)}</div>
          </section>
          <div id="find-tools"><ToolSearch hero/></div>
          <ToolDirectory/>
          <RecentToolLinks tools={siteTools.map(({ slug, name }) => ({ slug, name }))} added={recent}/>
        </div>

        <section className="home-block" id="how-it-works">
          <div className="home-section-title"><p className="home-kicker">How it works</p><h2>Three steps to a finished file</h2></div>
          <ol className="home-process">{steps.map(([title, description]) => <li key={title}>
            <h3>{title}</h3><p>{description}</p>
          </li>)}</ol>
        </section>

        <section className="home-block">
          <div className="home-section-title"><h2>Why Zipora</h2></div>
          <ul className="home-benefits">{['Free', 'No signup', 'Files stay in your browser', 'No watermark'].map(item => <li key={item}>{item}</li>)}</ul>
        </section>

        <section className="home-block" id="faq">
          <div className="home-section-title"><p className="home-kicker">Questions</p><h2>Frequently asked questions</h2></div>
          <div className="home-faq">{questions.map(([question, answer]) => <details key={question}>
            <summary>{question}<Plus size={18} aria-hidden="true"/></summary><p>{answer}</p>
          </details>)}</div>
        </section>

        <section className="home-block home-closing">
          <h2>Ready to get a file done?</h2>
          <a className="home-button home-button-primary" href="#tools">Browse all tools</a>
        </section>
      </div>
    </main>
    <JsonLd data={{ '@context': 'https://schema.org', ...webPageSchema('/', 'Zipora — Free PDF, image and QR tools', '41 free browser-based tools for PDFs, images, QR codes and JSON. No signup or file uploads.') }}/>
    <SiteFooter/>
  </div>;
}

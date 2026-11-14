import Link from 'next/link';
import { ArrowRight, LockKeyhole, Plus } from 'lucide-react';
import { toolInfo } from '@/lib/site-content';
import { toolGuidance, toolMeasurements } from '@/lib/tool-guidance';
import { absoluteUrl } from '@/lib/site-url';
import { webPageSchema, breadcrumbSchema, faqSchema, howToSchema, organizationId } from '@/lib/seo';
import { AdSlot } from './site-chrome';
import { JsonLd } from './json-ld';
import { ToolControls } from './tool-session';
import { blogPosts } from '@/lib/blog';

export function ToolIntro({ slug }: { slug: string }) {
  const tool = toolInfo(slug);
  return <>
    <AdSlot position="top"/>
    <section className="intro">
      <div><h1>{tool.h1}</h1><p>{tool.description}</p></div>
      <div className="intro-note"><LockKeyhole/><span>Free, no signup<br/><strong>Processed in your browser</strong></span></div>
    </section>
    <ToolControls slug={tool.slug} name={tool.name}/>
  </>;
}

export function ToolSections({ slug }: { slug: string }) {
  const tool = toolInfo(slug);
  const guidance = toolGuidance[tool.slug];
  const related = tool.related.map(toolInfo);
  const path = `/${tool.slug}/`;
  const applicationId = absoluteUrl(`${path}#application`);
  const categoryAnchor = { 'PDF Tools': '/#pdf-tools', 'Image Tools': '/#image-tools', 'Other Tools': '/#other-tools' }[tool.group];
  const graph = [
    { ...webPageSchema(path, tool.h1, tool.description), mainEntity: { '@id': applicationId } },
    {
      '@type': 'SoftwareApplication',
      '@id': applicationId,
      name: `Zipora ${tool.name}`,
      applicationCategory: 'UtilitiesApplication',
      url: absoluteUrl(path),
      description: tool.description,
      isAccessibleForFree: true,
      provider: { '@id': organizationId },
      featureList: [tool.name, 'No signup', 'Browser-based processing'],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    breadcrumbSchema([{ name: 'Home', path: '/' }, { name: tool.group, path: categoryAnchor }, { name: tool.name, path }]),
    faqSchema(path, tool.faqs),
    howToSchema(path, `How to use ${tool.name}`, tool.steps),
  ];
  return <>
    <JsonLd data={{ '@context': 'https://schema.org', '@graph': graph }}/>
    <section className="related-tools">
      <h2>Related Tools</h2>
      <div>{related.map(item => <Link key={item.slug} href={`/${item.slug}/`}>
        <strong>{item.name}</strong><p>{item.cardDescription}</p><ArrowRight/>
      </Link>)}</div>
    </section>
    <section id="how-it-works" className="how-section">
      <div className="section-title"><h2>How to use {tool.name}</h2><p>Three steps. No account or upload server.</p></div>
      <ol className="steps">{tool.steps.map(([title, detail], i) =>
        <li key={title}><span>0{i + 1}</span><div><h3>{title}</h3><p>{detail}</p></div></li>
      )}</ol>
    </section>
    <section className="legal-section">
      <h2>{guidance.heading}</h2>
      <p>{guidance.example}</p>
      {toolMeasurements[tool.slug] && <p>{toolMeasurements[tool.slug]}</p>}
      {tool.group === 'PDF Tools' && <p><Link className="text-link" href="/compare/zipora-vs-ilovepdf/">Compare Zipora and iLovePDF workflows<ArrowRight/></Link></p>}
    </section>
    {tool.group === 'PDF Tools' && <PdfComparison />}
    {tool.group === 'Image Tools' && <ImageComparison />}
    <section className="faq-section">
      <div><h2>{tool.name} questions</h2><p>Short answers, then the practical details.</p></div>
      <div className="faqs">{tool.faqs.map(faq =>
        <details key={faq.question}><summary>{faq.question}<Plus/></summary><p>{faq.answer}</p></details>
      )}</div>
    </section>
    {['word-counter', 'qr-code-generator'].includes(tool.slug) && <section className="legal-section">
      <h2>Additional Details</h2>
      <dl><dt>Name</dt><dd>{tool.name}</dd><dt>Price</dt><dd>Free</dd></dl>
    </section>}
  </>;
}

function PdfComparison() {
  const rows = [
    ['Web plans', 'Free', 'Free Basic and paid plans'],
    ['File processing', 'In your browser', 'On its servers'],
    ['Processed file retention', 'Files stay on your device', 'Up to two hours for standard PDF jobs'],
    ['Added output watermark', 'None', '—'],
  ];
  return <section className="legal-section">
    <h2>Zipora vs iLovePDF</h2>
    <div className="table-scroll"><table>
      <thead><tr>{['Feature', 'Zipora', 'iLovePDF'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
      <tbody>{rows.map(([label, own, other]) => <tr key={label}><th scope="row">{label}</th><td>{own}</td><td>{other}</td></tr>)}</tbody>
    </table></div>
    <p>Facts checked <time dateTime="2026-11-13">13 November 2026</time></p>
    <p><a className="text-link" href="https://www.ilovepdf.com/pricing">Official pricing</a> · <a className="text-link" href="https://www.ilovepdf.com/help/faq">Official file retention FAQ</a></p>
  </section>;
}

function ImageComparison() {
  const posts = ['zipora-vs-iloveimg', 'zipora-vs-tinypng'].map(slug => blogPosts.find(post => post.slug === slug)!);
  const rows = [
    ['Web plans', 'Free', 'Free Basic and paid plans', 'Free web tier and paid plans'],
    ['Image processing', 'In your browser', 'On its servers', 'On its servers'],
    ['Uploaded image retention', 'Files stay on your device', 'Deleted within 2 hours', 'Deleted within 48 hours'],
    ['Added output watermark', 'None', '—', '—'],
  ];
  return <section className="legal-section">
    <h2>Zipora vs iLoveIMG and TinyPNG</h2>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm">
      <thead><tr>{['Feature', 'Zipora', ...posts.map(post => post.competitor)].map(label => <th key={label} scope="col" className="p-2">{label}</th>)}</tr></thead>
      <tbody>{rows.map(([label, ...values]) => <tr key={label} className="border-t">
        <th scope="row" className="p-2">{label}</th>{values.map((value, index) => <td key={index} className="p-2">{value}</td>)}
      </tr>)}</tbody>
    </table></div>
    <p>Facts checked <time dateTime="2026-11-13">13 November 2026</time></p>
    <h3>Official sources</h3>
    <ul>{posts.flatMap(post => post.sources.slice(0, 2)).map(source => <li key={source.url}><a className="text-link" href={source.url}>{source.label}</a></li>)}</ul>
  </section>;
}

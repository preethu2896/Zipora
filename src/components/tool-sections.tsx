import Link from 'next/link';
import { ArrowRight, LockKeyhole, Plus } from 'lucide-react';
import { toolInfo } from '@/lib/site-content';
import { toolGuidance, toolMeasurements } from '@/lib/tool-guidance';
import { absoluteUrl } from '@/lib/site-url';
import { webPageSchema, breadcrumbSchema, organizationId } from '@/lib/seo';
import { AdSlot } from './site-chrome';
import { JsonLd } from './json-ld';

export function ToolIntro({ slug }: { slug: string }) {
  const tool = toolInfo(slug);
  return <>
    <AdSlot position="top"/>
    <section className="intro">
      <div><h1>{tool.h1}</h1><p>{tool.description}</p></div>
      <div className="intro-note"><LockKeyhole/><span>Free, no signup<br/><strong>Processed in your browser</strong></span></div>
    </section>
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
    <section className="faq-section">
      <div><h2>{tool.name} questions</h2><p>Short answers, then the practical details.</p></div>
      <div className="faqs">{tool.faqs.map(faq =>
        <details key={faq.question}><summary>{faq.question}<Plus/></summary><p>{faq.answer}</p></details>
      )}</div>
    </section>
  </>;
}

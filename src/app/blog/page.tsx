import { removeBgArticle } from '@/lib/remove-bg-article';
import { JsonLd } from '@/components/json-ld';
import { webPageSchema } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site-url';
import { pageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SiteHeader,SiteFooter,AdSlot } from '@/components/site-chrome';
import { blogPosts,checkedLabel,readingMinutes } from '@/lib/blog';
import { comparisons } from '@/lib/comparisons';
export const metadata = pageMetadata('/blog/', 'Zipora Blog — Free PDF & Image Tools, Compared', 'Compare PDF and image workflows, file handling and tool limits. Read Zipora’s dated comparisons with links to official sources.');
export default function BlogIndex(){
 const cards=[{href:removeBgArticle.path,title:removeBgArticle.heading,summary:removeBgArticle.summary,minutes:2,date:removeBgArticle.date,label:'13 November 2026',type:'Guide'},...comparisons.map(c=>({href:`/compare/${c.slug}/`,title:c.h1,summary:c.competitor==='iLovePDF'?'Local PDFs or a wider PDF suite.':'Image tools and the Canva move.',minutes:3})),...blogPosts.map(p=>({href:`/blog/${p.slug}/`,title:p.h1,summary:p.summary,minutes:readingMinutes(p)}))];
 return <><JsonLd data={{'@context':'https://schema.org',...webPageSchema('/blog/','Zipora Blog','Dated comparisons of file tools with official sources.','CollectionPage'),mainEntity:{'@type':'ItemList',itemListElement:cards.map((card,i)=>({'@type':'ListItem',position:i+1,name:card.title,url:absoluteUrl(card.href)}))}}}/><SiteHeader/><main className="main-shell editorial blog-index"><section className="intro"><div><p className="blog-eyebrow">Tools, compared</p><h1>Zipora Blog</h1><p>Compare PDF, image and QR workflows using examples and official sources.</p><p><Link href="/compare/">Browse the Zipora comparison hub</Link></p></div></section><AdSlot position="blog-top"/><div className="blog-grid">{cards.map(card=><Link className="blog-card" href={card.href} key={card.href}><div className="blog-card-meta"><span>{'type' in card ? card.type : 'Comparison'}</span><ArrowUpRight/></div><h2>{card.title}</h2><p>{card.summary}</p><div className="blog-card-foot"><time dateTime={'date' in card ? card.date : '2026-11-08'}>Checked {'label' in card ? card.label : checkedLabel}</time><span>{card.minutes} min read</span></div></Link>)}</div></main><SiteFooter/></>;
}

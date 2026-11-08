import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SiteHeader,SiteFooter,AdSlot } from '@/components/site-chrome';
import { blogPosts,checkedLabel,readingMinutes } from '@/lib/blog';
import { comparisons } from '@/lib/comparisons';
export const metadata={title:'Zipora Blog — Free PDF & Image Tools, Compared',description:'Honest comparisons of free PDF and image tools, checked against official pricing, privacy and help pages.',alternates:{canonical:'/blog/'}};
export default function BlogIndex(){
 const cards=[...comparisons.map(c=>({href:`/compare/${c.slug}/`,title:c.h1,summary:c.competitor==='iLovePDF'?'Local PDFs or a wider PDF suite.':'Image tools and the Canva move.',minutes:3})),...blogPosts.map(p=>({href:`/blog/${p.slug}/`,title:p.h1,summary:p.summary,minutes:readingMinutes(p)}))];
 return <><SiteHeader/><main className="main-shell editorial blog-index"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><span aria-current="page">Blog</span></nav><section className="intro"><div><p className="blog-eyebrow">Tools, compared</p><h1>Zipora Blog</h1><p>Honest comparisons of free PDF and image tools, checked against the official site.</p></div></section><AdSlot position="blog-top"/><div className="blog-grid">{cards.map(card=><Link className="blog-card" href={card.href} key={card.href}><div className="blog-card-meta"><span>Comparison</span><ArrowUpRight/></div><h2>{card.title}</h2><p>{card.summary}</p><div className="blog-card-foot"><time dateTime="2026-11-08">Checked {checkedLabel}</time><span>{card.minutes} min read</span></div></Link>)}</div></main><SiteFooter/></>;
}

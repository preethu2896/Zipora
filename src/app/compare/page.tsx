import { JsonLd } from '@/components/json-ld';
import { webPageSchema, breadcrumbSchema } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site-url';
import { pageMetadata } from '@/lib/seo';
import Link from 'next/link';
import { SiteHeader,SiteFooter } from '@/components/site-chrome';
import { comparisons } from '@/lib/comparisons';
export const metadata = pageMetadata('/compare/', 'Compare Zipora with Other File Tools | Zipora', 'Compare Zipora with iLovePDF and remove.bg: supported tasks, browser or server processing, access and availability, with dated official sources.');
export default function Page(){return <><JsonLd data={{'@context':'https://schema.org','@graph':[{...webPageSchema('/compare/','Compare file workflows','Compare Zipora with iLovePDF and remove.bg.','CollectionPage'),mainEntity:{'@type':'ItemList',itemListElement:comparisons.map((c,i)=>({'@type':'ListItem',position:i+1,name:c.h1,url:absoluteUrl(`/compare/${c.slug}/`)}))}},breadcrumbSchema([{name:'Home',path:'/'},{name:'Compare',path:'/compare/'}])]}}/><SiteHeader active="Compare"/><main className="main-shell editorial"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>›</span><span aria-current="page">Compare</span></nav><section className="intro"><div><h1>Compare file workflows</h1><p>Free, no signup. Zipora processes files in your browser. Compare the task you need and check each service’s current details.</p><p><Link href="/blog/">Explore all PDF, image and QR comparisons</Link></p></div></section><section className="related-tools"><h2>PDF and image tool comparisons</h2><div>{comparisons.map(c=><Link key={c.slug} href={`/compare/${c.slug}/`}><strong>Zipora vs {c.competitor}</strong><p>{c.intro}</p></Link>)}</div></section></main><SiteFooter/></>;}

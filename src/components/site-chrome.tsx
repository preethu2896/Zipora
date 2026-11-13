'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu,X,ArrowRight } from 'lucide-react';
import { siteTools } from '@/lib/site-content';
import { useToolSearch } from './tool-search';
import { HomeHeader } from './home-header';

function useToolPath() {
 const slug = usePathname().replace(/^\/+|\/+$/g, '');
 const canonical = slug === 'image-resizer' ? 'resize-image' : slug === 'pdf-compressor' ? 'compress-pdf' : slug;
 return siteTools.some(tool => tool.slug === canonical) ? canonical : undefined;
}
export function Brand(){return <span className="brand"><img className="brand-logo" src="/logo.png" width={48} height={44} alt="" aria-hidden="true"/><img className="brand-wordmark" src="/wordmark.png" width={112} height={38} alt="Zipora"/></span>;}
function scrollBrandToTop(){if(window.location.pathname==='/')window.scrollTo({top:0,left:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
export function SiteHeader({active}:{active?:string}){
 const [open,setOpen]=useState(false);const {setQuery}=useToolSearch();
 const toolPath = useToolPath();
 if (toolPath) return <HomeHeader key={toolPath} toolPath={toolPath}/>;
 return <header className="site-header"><div className="header-inner"><Link href="/#top" className="brand-link" aria-label="Zipora home" onClick={()=>{setQuery('');setOpen(false);scrollBrandToTop();}}><Brand/></Link><button className="menu-toggle" aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls="main-navigation" onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><nav id="main-navigation" className={open?'is-open':''} aria-label="Main navigation"><Link href="/#tools" onClick={()=>{setOpen(false);setQuery('');}}>All Tools</Link><Link href="/#pdf-tools" onClick={()=>{setOpen(false);setQuery('');}}>PDF Tools</Link><Link href="/#image-tools" onClick={()=>{setOpen(false);setQuery('');}}>Image Tools</Link><Link href="/blog/" onClick={()=>setOpen(false)}>Blog</Link></nav></div></header>;
}
export function SiteFooter({textWordmark=false}:{textWordmark?:boolean}={}){const {setQuery}=useToolSearch();const toolPath=useToolPath();return <><AdSlot position="footer"/><footer className="zipora-footer" onClick={event=>{if((event.target as Element).closest('a'))setQuery('');}}><div className="footer-brand"><Link href="/#top" aria-label="Zipora home" onClick={scrollBrandToTop}>{(textWordmark||toolPath)?<span className="home-wordmark">Zipora</span>:<Brand/>}</Link><p>Your files. Done in a flash.</p></div><div className="footer-columns"><nav className="footer-tools" aria-label="All file tools">{(['PDF Tools','Image Tools','Other Tools'] as const).map(group=><section key={group}><h2>{group}</h2>{siteTools.filter(t=>t.group===group).map(t=><Link key={t.slug} href={`/${t.slug}/`}>{t.name}</Link>)}</section>)}</nav><section><h2>Company</h2><Link href="/about/">About</Link><Link href="/contact/">Contact</Link><Link href="/blog/">Blog</Link><a href="mailto:contact@zipora.online">contact@zipora.online</a><Link href="/privacy-policy/">Privacy Policy</Link><Link href="/security-and-privacy/">Security &amp; Privacy</Link><Link href="/terms/">Terms</Link><Link href="/compare/zipora-vs-ilovepdf/">Zipora vs iLovePDF</Link><Link href="/compare/zipora-vs-removebg/">Zipora vs remove.bg</Link></section></div><div className="flex justify-center pt-6"><a href="https://www.producthunt.com/products/zipora-2?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-zipora-2" target="_blank" rel="noopener noreferrer" className="block max-w-full"><img alt="Zipora - Free online tools for everyday digital tasks | Product Hunt" width={250} height={54} src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1309576&theme=light&t=1794205528363" className="block h-auto w-[160px] max-w-full"/></a></div><div className="footer-bottom"><span>© 2026 Zipora</span><span>Free, no signup. Files are processed in your browser.</span><Link href="/#tools">All tools<ArrowRight/></Link></div></footer></>;}
export function AdSlot(_props: { position: string }) { return null; }

import Link from 'next/link';
import { SiteHeader,SiteFooter } from '@/components/site-chrome';
export default function NotFound(){return <><SiteHeader active="Page not found"/><main className="main-shell editorial"><section className="intro"><div><h1>That page isn’t here</h1><p>The link may have changed. Choose one of Zipora’s live tools to get back to your file.</p></div></section><Link className="primary" href="/#tools">Browse all tools</Link></main><SiteFooter/></>;}

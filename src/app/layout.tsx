import type { Metadata } from 'next';
import './globals.css';
import './polish.css';
import './home.css';
import { ToolSearchProvider } from '@/components/tool-search';
import { siteUrl } from '@/lib/site-url';
import { ToolRouteScroll } from '@/components/tool-route-scroll';
import { ToolSession } from '@/components/tool-session';
import { JsonLd } from '@/components/json-ld';
import { siteDescription, siteSchema } from '@/lib/seo';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Zipora — Free Online PDF & Image Tools, No Signup',
  description: siteDescription,
  applicationName: 'Zipora',
  verification: { other: { 'msvalidate.01': '23D589D329DA0DF7BB87D77E51035641' } },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html id="top" lang="en"><body><JsonLd data={siteSchema()}/><ToolSearchProvider><ToolRouteScroll/><ToolSession>{children}</ToolSession></ToolSearchProvider></body></html>;
}

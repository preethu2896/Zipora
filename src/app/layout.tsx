import type { Metadata } from 'next';
import './globals.css';
import './polish.css';
import { ToolSearchProvider } from '@/components/tool-search';
import { siteUrl } from '@/lib/site-url';
import { ToolRouteScroll } from '@/components/tool-route-scroll';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Zipora — Free Online PDF & Image Tools, No Signup',
  description: 'Free browser-based PDF, image and QR tools. No signup, no file uploads and no output watermarks.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html id="top" lang="en"><body><ToolSearchProvider><ToolRouteScroll/>{children}</ToolSearchProvider></body></html>;
}

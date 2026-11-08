import type { MetadataRoute } from 'next';
import { blogPaths } from '@/lib/blog';
import { publicPaths } from '@/lib/site-content';
import { absoluteUrl } from '@/lib/site-url';
export const dynamic='force-static';
// Omit lastModified unless a page has a maintained content-change date; a build is not an edit.
export default function sitemap():MetadataRoute.Sitemap{return [...new Set([...publicPaths,...blogPaths])].map(path=>({url:absoluteUrl(path)}));}

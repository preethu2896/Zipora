import type { MetadataRoute } from 'next';
import { blogPaths } from '@/lib/blog';
import { publicPaths } from '@/lib/site-content';
import { absoluteUrl } from '@/lib/site-url';
export const dynamic='force-static';
export default function sitemap():MetadataRoute.Sitemap{return [...publicPaths,...blogPaths].map(path=>({url:absoluteUrl(path)}));}

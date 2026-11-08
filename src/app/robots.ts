import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site-url';
export const dynamic='force-static';
export default function robots():MetadataRoute.Robots{return {rules:[{userAgent:'*',allow:'/'},...['GPTBot','ClaudeBot','PerplexityBot','Google-Extended'].map(userAgent=>({userAgent,allow:'/'}))],sitemap:absoluteUrl('/sitemap.xml')};}

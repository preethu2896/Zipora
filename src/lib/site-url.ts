/** Configure after choosing a domain; brand and navigation stay domain-independent. */
export const siteUrl=(process.env.NEXT_PUBLIC_SITE_URL||'https://zipora.online').replace(/\/+$/,'');
export const contactEmail=process.env.NEXT_PUBLIC_CONTACT_EMAIL||'contact@zipora.online';
export function absoluteUrl(path:string){return new URL(path,siteUrl).href;}

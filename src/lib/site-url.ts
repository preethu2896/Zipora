/** Public canonical origin. Vercel redirects the apex domain to this www host. */
export const siteUrl='https://www.zipora.online';
export const contactEmail=process.env.NEXT_PUBLIC_CONTACT_EMAIL||'contact@zipora.online';
export function absoluteUrl(path:string){return new URL(path,siteUrl).href;}

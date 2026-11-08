import type { Metadata } from 'next';
import { absoluteUrl, contactEmail } from './site-url';

export const siteDescription = 'Free browser-based PDF, image and QR tools. Merge, split, compress, resize and convert files without signup or file uploads.';
export const organizationId = absoluteUrl('/#organization');
export const websiteId = absoluteUrl('/#website');
export const socialImage = { url: absoluteUrl('/social-card.png'), width: 1200, height: 630, alt: 'Zipora — PDF, image and QR tools. Free, no signup, processed in your browser.' };

export function pageMetadata(path: string, title: string, description: string, article?: { publishedTime: string; modifiedTime: string }): Metadata {
  const url = absoluteUrl(path);
  return {
    title, description, alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Zipora', locale: 'en_US', images: [socialImage], ...(article ? { type: 'article' as const, ...article } : { type: 'website' as const }) },
    twitter: { card: 'summary_large_image', title, description, images: [{ url: socialImage.url, alt: socialImage.alt }] },
  };
}

export function siteSchema() {
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Organization', '@id': organizationId, name: 'Zipora', url: absoluteUrl('/'), description: siteDescription, logo: { '@type': 'ImageObject', url: absoluteUrl('/logo.png') }, email: contactEmail },
    { '@type': 'WebSite', '@id': websiteId, name: 'Zipora', url: absoluteUrl('/'), description: siteDescription, inLanguage: 'en', publisher: { '@id': organizationId } },
  ] };
}

export function webPageSchema(path: string, name: string, description: string, type = 'WebPage') {
  return { '@type': type, '@id': absoluteUrl(`${path}#webpage`), url: absoluteUrl(path), name, description, inLanguage: 'en', isPartOf: { '@id': websiteId }, publisher: { '@id': organizationId } };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return { '@type': 'BreadcrumbList', itemListElement: items.map(({ name, path }, i) => ({ '@type': 'ListItem', position: i + 1, name, item: absoluteUrl(path) })) };
}

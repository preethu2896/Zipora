import Link from 'next/link';
import { Check } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { JsonLd } from '@/components/json-ld';
import { breadcrumbSchema, pageMetadata, webPageSchema } from '@/lib/seo';
import { contactEmail } from '@/lib/site-url';
import { SponsorForm } from './sponsor-form';
import styles from './advertise.module.css';

const path = '/advertise/';
const title = 'Advertise on Zipora — Sponsor a Frame, $30 a Month | Zipora';
const description = "Put your brand in front of people using Zipora's 41 free tools. One frame, $30 a month, logo + name + tagline.";
export const metadata = pageMetadata(path, title, description);

const benefits = [
  'Your logo, name and tagline in a frame on the Zipora homepage.',
  'Planned tool-page placement, with two sponsors displayed at a time.',
  'A link opening your site in a new tab, tagged ?ref=zipora.',
  'No visitor tracking is part of this sponsorship form.',
  '$30 a month for every frame. Cancel any time and keep your placement through the paid month.',
  'We review your brand before confirming your placement.',
  'If a payment has been made and your frame is declined, you receive a full refund.',
];

export default function AdvertisePage() {
  return <>
    <SiteHeader/>
    <main id="main" className={styles.page}>
      <h1>Sponsor a frame</h1>
      <p>Twelve frames on the Zipora homepage. Each frame is one brand. Sponsors help keep the tools free for everyone.</p>
      <p>Files stay in your browser. Nothing uploads.</p>
      <section><h2>What you get</h2><ul className={styles.benefits}>
        {benefits.map(item => <li key={item}><Check size={18} aria-hidden="true"/>{item}</li>)}
      </ul></section>
      <section><h2>What we accept</h2>
        <ul>
          <li><strong>Fits best:</strong> PDF, image and video tools, creator tools, editing apps, fonts, courses, and tools for students and offices.</li>
          <li><strong>Not allowed:</strong> Gambling or betting, crypto or trading, adult content, weapons, loans, misleading claims, or malware.</li>
        </ul>
        <p>Questions? Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
      </section>
      <section className={styles.card}><h2>Your frame</h2><SponsorForm/>
        <p className={styles.hint}>Payment is arranged by email after your frame is confirmed. See the <Link href="/terms/">Terms and refund information</Link> and <Link href="/privacy-policy/">Privacy Policy</Link>.</p>
      </section>
    </main>
    <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
      webPageSchema(path, 'Sponsor a frame', description),
      breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Advertise', path }]),
    ] }}/>
    <SiteFooter/>
  </>;
}

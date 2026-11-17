import Link from 'next/link';
import { ArrowLeft, Check } from 'lucide-react';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { JsonLd } from '@/components/json-ld';
import { breadcrumbSchema, pageMetadata, webPageSchema } from '@/lib/seo';
import { contactEmail } from '@/lib/site-url';
import { SponsorForm } from './sponsor-form';
import styles from './advertise.module.css';

const path = '/advertise/';
const title = 'Advertise on Zipora — Sponsor a Frame, $30 a Month | Zipora';
const description = "Put your brand in front of people using Zipora's 42 free tools. One frame, $30 a month, logo + name + tagline.";
export const metadata = pageMetadata(path, title, description);

const benefits = [
  'Your logo, name and tagline in a frame on the Zipora homepage.',
  'A direct link to your website.',
  'One month of placement with no automatic renewal.',
];

export default function AdvertisePage() {
  return <>
    <SiteHeader/>
    <main id="main" className={styles.page}>
      <Link className={styles.back} href="/"><ArrowLeft size={16} aria-hidden="true"/> Back to homepage</Link>
      <div className={styles.layout}>
        <div>
          <h1>Sponsor a frame</h1>
          <p className={styles.lead}>Give your brand a spot on Zipora and help keep the tools free.</p>
          <section className={styles.offer} aria-labelledby="sponsor-offer">
            <div className={styles.offerHeading}>
              <div><h2 id="sponsor-offer">Homepage sponsor placement</h2><p>One month, paid once</p></div>
              <div className={styles.price}>$30 <span>USD</span></div>
            </div>
            <ul className={styles.benefits}>
              {benefits.map(item => <li key={item}><Check size={18} aria-hidden="true"/>{item}</li>)}
            </ul>
          </section>
          <p>Your sponsorship details and logo are used to review your placement. If a paid placement is declined, you receive a full refund.</p>
          <section className={styles.guidelines}><h2>What we accept</h2>
            <ul>
              <li><strong>Fits best:</strong> PDF, image and video tools, creator tools, editing apps, fonts, courses, and tools for students and offices.</li>
              <li><strong>Not allowed:</strong> Gambling or betting, crypto or trading, adult content, weapons, loans, misleading claims, or malware.</li>
            </ul>
            <p>Questions? Email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
          </section>
        </div>
        <section className={styles.card}><h2>Your brand details</h2><SponsorForm/>
        <p className={styles.hint}>{process.env.NEXT_PUBLIC_SPONSOR_LIVE_API
          ? 'Checkout temporarily holds your frame. After payment, your placement goes to review. '
          : process.env.NEXT_PUBLIC_SPONSOR_TEST_API
          ? 'Test checkout temporarily holds your frame. After payment, your placement goes to review. '
          : 'Payment is arranged by email after your frame is confirmed. '}See the <Link href="/terms/">Terms and refund information</Link> and <Link href="/privacy-policy/">Privacy Policy</Link>.</p>
        </section>
      </div>
    </main>
    <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
      webPageSchema(path, 'Sponsor a frame', description),
      breadcrumbSchema([{ name: 'Home', path: '/' }, { name: 'Advertise', path }]),
    ] }}/>
    <SiteFooter/>
  </>;
}

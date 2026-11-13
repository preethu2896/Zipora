import Link from 'next/link';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { JsonLd } from '@/components/json-ld';
import { breadcrumbSchema, pageMetadata, webPageSchema } from '@/lib/seo';
import { contactEmail } from '@/lib/site-url';

const path = '/security-and-privacy/';
const title = 'Security & Privacy';
const description = 'How Zipora processes files in your browser, stores recent tools locally, and handles website requests.';
export const metadata = pageMetadata(path, title + ' | Zipora', description);

export default function SecurityAndPrivacy() {
  return <>
    <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
      webPageSchema(path, title, description),
      breadcrumbSchema([{ name: 'Home', path: '/' }, { name: title, path }]),
    ] }}/>
    <SiteHeader active={title}/>
    <main className="main-shell editorial company-content">
      <section className="intro"><div><h1>{title}</h1><p>{description}</p></div></section>
      <section className="legal-section"><h2>Your files stay on your device</h2>
        <p>Zipora processes files in your browser. Your files are never uploaded to a file-processing server. The tools are free and require no account, signup or payment.</p>
      </section>
      <section className="legal-section"><h2>Cookies and local preferences</h2>
        <p>Zipora sets no tracking cookies today. Zipora loads no analytics trackers or active advertising scripts. The grey ad boxes are placeholders.</p>
        <p>Recently used tool names are stored in this browser and stay on your device. We will update the <Link href="/privacy-policy/">Privacy Policy</Link> and add consent controls before introducing analytics or active advertising.</p>
      </section>
      <section className="legal-section"><h2>Website requests</h2>
        <p>The hosting provider may keep routine logs such as your IP address, browser, requested URL and time. The Product Hunt badge loads from Product Hunt. Your selected files are separate from these requests.</p>
      </section>
      <section className="legal-section"><h2>File size and device limits</h2>
        <p>Large-file warnings start at 100 MB for images and 200 MB for PDFs. Individual tools can have smaller input, page or pixel limits. Check the limits shown by the tool you’re using.</p>
      </section>
      <section className="legal-section"><h2>Report a problem</h2>
        <p>For technical problems or copyright reports, email <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>
      </section>
    </main>
    <SiteFooter/>
  </>;
}

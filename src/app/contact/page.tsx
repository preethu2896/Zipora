import { pageMetadata } from '@/lib/seo';
import CompanyPage, { companyTitle } from '@/components/company-page';
export const metadata = pageMetadata('/contact/', `${companyTitle('contact')} | Zipora`, 'Contact Zipora at contact@zipora.online for tool issues, feedback or corrections. Include your browser and device; do not email private files.');
export default function Page(){return <CompanyPage slug="contact"/>;}

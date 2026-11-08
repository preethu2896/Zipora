import { pageMetadata } from '@/lib/seo';
import CompanyPage, { companyTitle } from '@/components/company-page';
export const metadata = pageMetadata('/about/', `${companyTitle('about')} | Zipora`, 'About Zipora’s 19 free PDF, image and QR tools: browser-based processing, supported everyday tasks and practical device limits.');
export default function Page(){return <CompanyPage slug="about"/>;}

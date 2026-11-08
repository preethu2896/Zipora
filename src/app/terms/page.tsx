import { pageMetadata } from '@/lib/seo';
import CompanyPage, { companyTitle } from '@/components/company-page';
export const metadata = pageMetadata('/terms/', `${companyTitle('terms')} | Zipora`, 'Read Zipora’s terms for its free file tools, including acceptable use, output checks, practical limits and passport-photo acceptance.');
export default function Page(){return <CompanyPage slug="terms"/>;}

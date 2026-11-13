import { pageMetadata } from '@/lib/seo';
import CompanyPage, { companyTitle } from '@/components/company-page';
export const metadata = pageMetadata('/privacy-policy/', `${companyTitle('privacy-policy')} | Zipora`, 'Read how Zipora processes files in your browser, stores recent tools locally, and handles website delivery requests.');
export default function Page(){return <CompanyPage slug="privacy-policy"/>;}

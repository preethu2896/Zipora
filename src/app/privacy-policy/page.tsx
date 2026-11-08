import { pageMetadata } from '@/lib/seo';
import CompanyPage, { companyTitle } from '@/components/company-page';
export const metadata = pageMetadata('/privacy-policy/', `${companyTitle('privacy-policy')} | Zipora`, 'Read how Zipora processes files in your browser, handles website delivery requests and describes its current analytics and advertising policy.');
export default function Page(){return <CompanyPage slug="privacy-policy"/>;}

import CompanyPage, { companyTitle } from '@/components/company-page';
export const metadata={title:`${companyTitle('terms')} | Zipora`,description:'Learn about Zipora, its free browser-based tools and how the current service works.',alternates:{canonical:'/terms/'}};
export default function Page(){return <CompanyPage slug="terms"/>;}

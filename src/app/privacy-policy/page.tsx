import CompanyPage, { companyTitle } from '@/components/company-page';
export const metadata={title:`${companyTitle('privacy-policy')} | Zipora`,description:'Learn about Zipora, its free browser-based tools and how the current service works.',alternates:{canonical:'/privacy-policy/'}};
export default function Page(){return <CompanyPage slug="privacy-policy"/>;}

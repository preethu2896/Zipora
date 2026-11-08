import CompanyPage, { companyTitle } from '@/components/company-page';
export const metadata={title:`${companyTitle('contact')} | Zipora`,description:'Learn about Zipora, its free browser-based tools and how the current service works.',alternates:{canonical:'/contact/'}};
export default function Page(){return <CompanyPage slug="contact"/>;}

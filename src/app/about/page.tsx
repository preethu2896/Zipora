import CompanyPage, { companyTitle } from '@/components/company-page';
export const metadata={title:`${companyTitle('about')} | Zipora`,description:'Learn about Zipora, its free browser-based tools and how the current service works.',alternates:{canonical:'/about/'}};
export default function Page(){return <CompanyPage slug="about"/>;}

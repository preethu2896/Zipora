import ComparisonPage from '@/components/comparison-page';
import { comparisons } from '@/lib/comparisons';
const comparison=comparisons.find(c=>c.slug==='zipora-vs-removebg')!;
export const metadata={title:comparison.title,description:comparison.intro,alternates:{canonical:'/compare/zipora-vs-removebg/'}};
export default function Page(){return <ComparisonPage slug="zipora-vs-removebg"/>;}

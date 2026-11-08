import { pageMetadata } from '@/lib/seo';
import ComparisonPage from '@/components/comparison-page';
import { comparisons } from '@/lib/comparisons';
const comparison=comparisons.find(c=>c.slug==='zipora-vs-removebg')!;
export const metadata = pageMetadata('/compare/zipora-vs-removebg/', comparison.title, comparison.intro);
export default function Page(){return <ComparisonPage slug="zipora-vs-removebg"/>;}

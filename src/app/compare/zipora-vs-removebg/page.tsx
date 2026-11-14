import { pageMetadata } from '@/lib/seo';
import ComparisonPage from '@/components/comparison-page';
import { comparisons } from '@/lib/comparisons';
const comparison=comparisons.find(c=>c.slug==='zipora-vs-removebg')!;
export const metadata = pageMetadata('/compare/zipora-vs-removebg/', comparison.title, "Compare Zipora and remove.bg for background removal, including browser processing, PNG export and the move to Canva.");
export default function Page(){return <ComparisonPage slug="zipora-vs-removebg"/>;}

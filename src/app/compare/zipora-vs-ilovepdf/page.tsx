import { pageMetadata } from '@/lib/seo';
import ComparisonPage from '@/components/comparison-page';
import { comparisons } from '@/lib/comparisons';
const comparison=comparisons.find(c=>c.slug==='zipora-vs-ilovepdf')!;
export const metadata = pageMetadata('/compare/zipora-vs-ilovepdf/', comparison.title, comparison.intro);
export default function Page(){return <ComparisonPage slug="zipora-vs-ilovepdf"/>;}

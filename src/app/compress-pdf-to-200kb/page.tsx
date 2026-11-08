import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'compress-pdf-to-200kb')!;
const info = toolInfo('compress-pdf-to-200kb');
export const metadata = pageMetadata('/compress-pdf-to-200kb/', info.title, info.description);
export default function Page() { return <ExtraTool config={config} />; }

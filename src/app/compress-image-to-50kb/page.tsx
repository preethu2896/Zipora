import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'compress-image-to-50kb')!;
const info = toolInfo('compress-image-to-50kb');
export const metadata = pageMetadata('/compress-image-to-50kb/', info.title, info.description);
export default function Page() { return <ExtraTool config={config} />; }

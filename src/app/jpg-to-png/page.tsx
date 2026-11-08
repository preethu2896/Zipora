import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'jpg-to-png')!;
const info = toolInfo('jpg-to-png');
export const metadata = pageMetadata('/jpg-to-png/', info.title, info.description);
export default function Page() { return <ExtraTool config={config} />; }

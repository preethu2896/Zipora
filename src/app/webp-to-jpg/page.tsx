import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'webp-to-jpg')!;
const info = toolInfo('webp-to-jpg');
export const metadata = pageMetadata('/webp-to-jpg/', info.title, info.description);
export default function Page() { return <ExtraTool config={config} />; }

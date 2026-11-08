import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'image-compressor')!;
const info = toolInfo('image-compressor');
export const metadata = pageMetadata('/image-compressor/', info.title, info.description);
export default function Page() { return <ExtraTool config={config} />; }

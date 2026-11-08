import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'qr-code-generator')!;
const info = toolInfo('qr-code-generator');
export const metadata = pageMetadata('/qr-code-generator/', info.title, info.description);
export default function Page() { return <ExtraTool config={config} />; }

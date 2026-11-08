import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'passport-photo-maker')!;
const info = toolInfo('passport-photo-maker');
export const metadata = pageMetadata('/passport-photo-maker/', info.title, info.description);
export default function Page() { return <ExtraTool config={config} />; }

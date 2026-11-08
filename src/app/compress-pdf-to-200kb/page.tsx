import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'compress-pdf-to-200kb')!;
const info = toolInfo('compress-pdf-to-200kb');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/compress-pdf-to-200kb/'}};
export default function Page() { return <ExtraTool config={config} />; }

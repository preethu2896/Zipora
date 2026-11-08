import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'compress-image-to-50kb')!;
const info = toolInfo('compress-image-to-50kb');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/compress-image-to-50kb/'}};
export default function Page() { return <ExtraTool config={config} />; }

import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'image-compressor')!;
const info = toolInfo('image-compressor');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/image-compressor/'}};
export default function Page() { return <ExtraTool config={config} />; }

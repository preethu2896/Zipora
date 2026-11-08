import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'image-resizer')!;
const info = toolInfo('resize-image');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/resize-image/'}};
export default function Page() { return <ExtraTool config={config} />; }

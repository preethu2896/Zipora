import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'pdf-to-png')!;
const info = toolInfo('pdf-to-png');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/pdf-to-png/'}};
export default function Page() { return <ExtraTool config={config} />; }

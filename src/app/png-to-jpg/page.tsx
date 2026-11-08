import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'png-to-jpg')!;
const info = toolInfo('png-to-jpg');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/png-to-jpg/'}};
export default function Page() { return <ExtraTool config={config} />; }

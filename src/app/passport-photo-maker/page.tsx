import { toolInfo } from '@/lib/site-content';
import ExtraTool from '@/components/extra-tool';
import { extraTools } from '@/lib/extra-tools';
const config = extraTools.find(tool => tool.slug === 'passport-photo-maker')!;
const info = toolInfo('passport-photo-maker');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/passport-photo-maker/'}};
export default function Page() { return <ExtraTool config={config} />; }

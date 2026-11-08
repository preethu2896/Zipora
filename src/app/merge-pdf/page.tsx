import { toolInfo } from '@/lib/site-content';
import MergeTool from '@/components/merge-tool';
const info = toolInfo('merge-pdf');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/merge-pdf/'}};
export default function Page() { return <MergeTool />; }

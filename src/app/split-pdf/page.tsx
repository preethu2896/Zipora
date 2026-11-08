import { toolInfo } from '@/lib/site-content';
import SplitTool from '@/components/split-tool';
const info = toolInfo('split-pdf');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/split-pdf/'}};
export default function Page() { return <SplitTool />; }

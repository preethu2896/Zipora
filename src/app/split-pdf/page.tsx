import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import SplitTool from '@/components/split-tool';
const info = toolInfo('split-pdf');
export const metadata = pageMetadata('/split-pdf/', info.title, info.description);
export default function Page() { return <SplitTool />; }

import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import MergeTool from '@/components/merge-tool';
const info = toolInfo('merge-pdf');
export const metadata = pageMetadata('/merge-pdf/', info.title, info.description);
export default function Page() { return <MergeTool />; }

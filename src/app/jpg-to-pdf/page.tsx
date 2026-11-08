import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import ConversionTool from '@/components/conversion-tool';
const info = toolInfo('jpg-to-pdf');
export const metadata = pageMetadata('/jpg-to-pdf/', info.title, info.description);
export default function Page() { return <ConversionTool kind="images" />; }

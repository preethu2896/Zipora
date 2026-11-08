import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import ConversionTool from '@/components/conversion-tool';
const info = toolInfo('compress-pdf');
export const metadata = pageMetadata('/compress-pdf/', info.title, info.description);
export default function Page() { return <ConversionTool kind="compress" />; }

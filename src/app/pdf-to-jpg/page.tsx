import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';
import ConversionTool from '@/components/conversion-tool';
const info = toolInfo('pdf-to-jpg');
export const metadata = pageMetadata('/pdf-to-jpg/', info.title, info.description);
export default function Page() { return <ConversionTool kind="extract" />; }

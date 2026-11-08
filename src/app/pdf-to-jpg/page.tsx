import { toolInfo } from '@/lib/site-content';
import ConversionTool from '@/components/conversion-tool';
const info = toolInfo('pdf-to-jpg');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/pdf-to-jpg/'}};
export default function Page() { return <ConversionTool kind="extract" />; }

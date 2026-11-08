import { toolInfo } from '@/lib/site-content';
import ConversionTool from '@/components/conversion-tool';
const info = toolInfo('compress-pdf');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/compress-pdf/'}};
export default function Page() { return <ConversionTool kind="compress" />; }

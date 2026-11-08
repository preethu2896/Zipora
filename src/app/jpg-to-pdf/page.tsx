import { toolInfo } from '@/lib/site-content';
import ConversionTool from '@/components/conversion-tool';
const info = toolInfo('jpg-to-pdf');
export const metadata = {title:info.title,description:info.description,alternates:{canonical:'/jpg-to-pdf/'}};
export default function Page() { return <ConversionTool kind="images" />; }

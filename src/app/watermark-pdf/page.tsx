import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { ToolIntro, ToolSections } from '@/components/tool-sections';
import { WatermarkPdfTool } from '@/components/watermark-pdf-tool';
import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';

const info = toolInfo('watermark-pdf');
export const metadata = pageMetadata('/watermark-pdf/', info.title, info.description);

export default function WatermarkPdfPage() {
  return <>
    <a className="skip-link" href="#main">Skip to tool</a>
    <SiteHeader active="Watermark PDF" />
    <main id="main" className="main-shell">
      <ToolIntro slug="watermark-pdf" />
      <WatermarkPdfTool />
      <ToolSections slug="watermark-pdf" />
    </main>
    <SiteFooter />
  </>;
}

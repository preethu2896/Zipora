import { RotatePdfTool } from '@/components/rotate-pdf-tool';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { ToolIntro, ToolSections } from '@/components/tool-sections';
import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';

const info = toolInfo('rotate-pdf');
export const metadata = pageMetadata('/rotate-pdf/', info.title, info.description);

export default function RotatePdfPage() {
  return <>
    <a className="skip-link" href="#main">Skip to tool</a>
    <SiteHeader active="Rotate PDF" />
    <main id="main" className="main-shell">
      <ToolIntro slug="rotate-pdf" />
      <RotatePdfTool />
      <ToolSections slug="rotate-pdf" />
    </main>
    <SiteFooter />
  </>;
}

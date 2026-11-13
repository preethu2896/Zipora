import { VideoCompressorTool } from '@/components/video-compressor-tool';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { ToolIntro, ToolSections } from '@/components/tool-sections';
import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';

const slug = 'video-compressor';
const info = toolInfo(slug);
export const metadata = pageMetadata(`/${slug}/`, info.title, info.description);

export default function VideoCompressorPage() {
  return <>
    <a className="skip-link" href="#main">Skip to tool</a>
    <SiteHeader active={info.name} />
    <main id="main" className="main-shell">
      <ToolIntro slug={slug} />
      <VideoCompressorTool />
      <ToolSections slug={slug} />
    </main>
    <SiteFooter />
  </>;
}

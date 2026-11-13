import { GeminiCleanup } from '@/components/gemini-cleanup';
import { SiteFooter, SiteHeader } from '@/components/site-chrome';
import { ToolIntro, ToolSections } from '@/components/tool-sections';
import { pageMetadata } from '@/lib/seo';
import { toolInfo } from '@/lib/site-content';

const slug = 'gemini-watermark-remover';
const info = toolInfo(slug);
export const metadata = pageMetadata(`/${slug}/`, info.title, info.description);

export default function GeminiCleanupPage() {
  return <>
    <a className="skip-link" href="#main">Skip to tool</a>
    <SiteHeader active={info.name} />
    <main id="main" className="main-shell">
      <ToolIntro slug={slug} />
      <GeminiCleanup video={false} />
      <ToolSections slug={slug} />
    </main>
    <SiteFooter />
  </>;
}

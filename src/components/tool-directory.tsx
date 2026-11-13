'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Image, Wrench } from 'lucide-react';
import { siteTools } from '@/lib/site-content';
import { useToolSearch } from './tool-search';



const groups = [
  ['PDF Tools', 'pdf-tools', FileText],
  ['Image Tools', 'image-tools', Image],
  ['Other Tools', 'other-tools', Wrench],
] as const;

const examples: Record<string, [string, string]> = {
  'merge-pdf': ['2 PDFs', '1 PDF'],
  'split-pdf': ['PDF', 'Selected pages'],
  'rotate-pdf': ['Sideways pages', 'Upright pages'],
  'watermark-pdf': ['PDF', 'Watermarked PDF'],
  'add-page-numbers-to-pdf': ['PDF', 'Numbered pages'],
  'protect-pdf': ['PDF', 'Password-protected PDF'],
  'unlock-pdf': ['Locked PDF', 'Unlocked PDF'],
  'compress-pdf': ['PDF', 'Smaller PDF'],
  'jpg-to-pdf': ['JPGs', 'PDF'],
  'word-to-pdf': ['Word document', 'PDF'],
  'pdf-to-word': ['PDF text', 'DOCX'],
  'excel-to-pdf': ['Excel workbook', 'PDF'],
  'pdf-to-excel': ['PDF table', 'XLSX'],
  'pdf-to-jpg': ['PDF', 'JPG'],
  'pdf-to-png': ['PDF', 'PNG'],
  'crop-image': ['Photo', 'Cropped photo'],
  'rotate-image': ['Sideways image', 'Upright image'],
  'heic-to-jpg': ['HEIC', 'JPG'],
  'webp-to-jpg': ['WebP', 'JPG'],
  'png-to-jpg': ['PNG', 'JPG'],
  'jpg-to-png': ['JPG', 'PNG'],
  'image-compressor': ['Image', 'Smaller image'],
  'resize-image': ['Image', 'New dimensions'],
  'passport-photo-maker': ['Portrait', 'Passport photo'],
  'remove-background': ['Photo', 'Transparent PNG'],
  'video-compressor': ['1.23 MB', '684 KB'],
  'gemini-watermark-remover': ['Gemini image', 'Cleaned PNG'],
  'gemini-video-watermark-remover': ['Gemini video', 'Cleaned MP4'],
  'compress-image-to-20kb': ['1.52 MB', '19.57 KB'],
  'qr-code-generator': ['Link or text', 'QR code'],
  'json-formatter': ['Raw JSON', 'Formatted JSON'],
  'favicon-generator': ['Image', 'Favicon files'],
  'word-counter': ['Text', 'Word count'],
  'url-encoder': ['URL or text', 'Encoded or decoded value'],
  'uuid-generator': ['Generate', 'UUID v4'],
};

export default function ToolDirectory({ newest }: { newest: string[] }) {
  const { query, setQuery } = useToolSearch();
  const term = query.trim().toLowerCase();
  const shown = siteTools.filter(tool => tool.name.toLowerCase().includes(term));

  return <section id="tools" className="home-block" tabIndex={-1}>
    <div className="home-heading"><h2>PDF, Image &amp; Video Tools</h2>
      <span className="home-tag" role="status">{shown.length} {shown.length === 1 ? 'tool' : 'tools'}{term ? ' found' : ''}</span>
    </div>
    <p className="home-section-copy">All-in-one free toolkit: no watermark, no sign-up. Files are processed on your device.</p>
    {groups.map(([group, id, Icon]) => {
      const tools = shown.filter(tool => tool.group === group);
      if (!tools.length) return null;
      return <section className="home-tool-group" id={id} key={group}>
        <h3>{group} <span>{tools.length}</span></h3>
        <div className="home-tool-list">{tools.map(tool => {
          const target = /^compress-(pdf|image)-to-(\d+)kb$/.exec(tool.slug);
          const [before, after] = examples[tool.slug] ?? [
            target?.[1] === 'pdf' ? 'PDF' : 'Image',
            `${target?.[2]} KB target`,
          ];
          return <Link href={`/${tool.slug}/`} onClick={() => setQuery('')} className="tool-link" key={tool.slug}>
            <div className="home-card-top"><span className="home-icon"><Icon size={20} aria-hidden="true"/></span>
              {newest.includes(tool.slug) && <span className="home-tag home-new">New</span>}
            </div>
            <div><h4>{tool.name}</h4><p>{tool.cardDescription}</p></div>
            <div className="home-transform"><span>{before}</span><ArrowRight size={16} aria-hidden="true"/><strong>{after}</strong></div>
          </Link>;
        })}</div>
      </section>;
    })}
    {!shown.length && <p className="home-empty">No tools match “{query}”. Try a tool name or clear your search.</p>}
  </section>;
}

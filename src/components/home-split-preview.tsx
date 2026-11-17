import Link from 'next/link';
import { ArrowUpRight, Columns3, FileText, Images, Layers, Video } from 'lucide-react';

const previewIcons = [Columns3, Video, Images, FileText, Layers];

export function HomeSplitPreview() {
  return <div className="home-hero-art">
    <div className="home-hero-icons" aria-hidden="true">
      {previewIcons.map((Icon, index) => <span key={index}><Icon size={28} strokeWidth={1.5}/></span>)}
    </div>
    <figure className="home-split-preview">
      <figcaption>
        <span><Columns3 size={18} strokeWidth={1.5} aria-hidden="true"/> Split Image</span>
        <Link href="/split-image/">Try Split Image <ArrowUpRight size={15} strokeWidth={1.5} aria-hidden="true"/></Link>
      </figcaption>
      <div className="home-split-preview-body">
        <div className="home-split-meta">
          <strong>Spider-Man sample</strong>
          <dl><div><dt>Direction</dt><dd>Vertical</dd></div><div><dt>Pieces</dt><dd>20</dd></div></dl>
        </div>
        <div className="home-split-artwork">
          <div className="home-split-numbers" aria-hidden="true">{Array.from({length:20}, (_, index) =>
            <span key={index}>{String(index + 1).padStart(2, '0')}</span>)}</div>
          <img src="/split-image-sample.jpg" width={800} height={450} alt="Spider-Man artwork divided into 20 vertical pieces" fetchPriority="high"/>
        </div>
      </div>
    </figure>
  </div>;
}

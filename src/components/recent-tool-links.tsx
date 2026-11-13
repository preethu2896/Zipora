'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { recentTools } from './tool-session';

export function RecentToolLinks({ tools, added }: {
  tools: { slug: string; name: string }[];
  added: string[];
}) {
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    const refresh = () => setRecent(recentTools());
    refresh();
    window.addEventListener('pageshow', refresh);
    return () => window.removeEventListener('pageshow', refresh);
  }, []);
  function section(title: string, slugs: string[]) {
    const items = slugs.flatMap(slug => tools.find(tool => tool.slug === slug) ?? []);
    if (!items.length) return null;
    return <section className="landing-section">
      <div className="section-title"><h2>{title}</h2></div>
      <ul className="flex flex-wrap gap-x-5 gap-y-3">{items.map(tool =>
        <li key={tool.slug}><Link className="text-link" href={`/${tool.slug}/`}>{tool.name}</Link></li>,
      )}</ul>
    </section>;
  }
  return <>{section('Recently used', recent)}{section('Recently added', added)}</>;
}

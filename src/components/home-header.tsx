'use client';

import Link from 'next/link';
import { Menu, Search, X } from 'lucide-react';
import { useState } from 'react';
import { Brand } from './site-chrome';
import { useToolSearch } from './tool-search';

const links = [['All Tools', '#tools'], ['PDF Tools', '#pdf-tools'], ['Image Tools', '#image-tools'], ['Blog', '/blog/']];

export function HomeHeader() {
  const [open, setOpen] = useState(false);
  const { setQuery } = useToolSearch();
  function close() {
    setQuery('');
    setOpen(false);
  }
  return <header className="home-header site-header">
    <Link href="#top" className="brand-link" aria-label="Zipora home" onClick={close}><Brand/></Link>
    <nav id="home-navigation" aria-label="Main navigation" className={open ? 'is-open' : ''}>
      {links.map(([label, href]) => <Link href={href} key={href} onClick={close}>{label}</Link>)}
    </nav>
    <div className="home-header-actions">
      <a className="home-search-icon" href="#find-tools" aria-label="Search tools" onClick={event => {
        const search = document.querySelector<HTMLInputElement>('#find-tools input');
        if (!search) return;
        event.preventDefault();
        search.focus();
        document.querySelector('#find-tools')?.scrollIntoView({ block: 'center' });
      }}><Search size={18} aria-hidden="true"/></a>
      <a className="home-button home-button-primary" href="#tools" onClick={close}>Browse tools</a>
    </div>
    <button className="menu-toggle" type="button" aria-label={open ? 'Close navigation' : 'Open navigation'}
      aria-expanded={open} aria-controls="home-navigation" onClick={() => setOpen(!open)}>
      {open ? <X aria-hidden="true"/> : <Menu aria-hidden="true"/>}
    </button>
  </header>;
}

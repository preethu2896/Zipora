'use client';

import Link from 'next/link';
import { FileText, Image, Menu, Moon, Search, Sun, Wrench, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { siteTools } from '@/lib/site-content';
import { useToolSearch } from './tool-search';

const groups = [['PDF Tools', FileText], ['Image Tools', Image], ['Other Tools', Wrench]] as const;
const company = [['About', '/about/'], ['Contact', '/contact/'], ['Blog', '/blog/'], ['Privacy Policy', '/privacy-policy/'], ['Terms', '/terms/'], ['Security & Privacy', '/security-and-privacy/']];
const themeKey = 'zipora-home-theme';

export function HomeHeader({ toolPath }: { toolPath?: string }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const { setQuery } = useToolSearch();

  useEffect(() => {
    try {
      setDark(localStorage.getItem(themeKey) === 'dark');
    } catch {
      // The toggle still works when storage is unavailable.
    }
  }, []);

  function switchTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    try {
      localStorage.setItem(themeKey, nextDark ? 'dark' : 'light');
    } catch {
      // Keep the selected theme for this visit.
    }
  }

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  function close() {
    setQuery('');
    setOpen(false);
  }

  return <header className={toolPath ? 'home-sidebar tool-site-sidebar' : 'home-sidebar'} data-theme={dark ? 'dark' : 'light'}>
    <div className="home-sidebar-top">
      <Link href={toolPath ? '/' : '#top'} className="home-wordmark" onClick={close}>Zipora</Link>
      <button type="button" className="home-theme-toggle" onClick={switchTheme}
        aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
        {dark ? <Sun size={19} aria-hidden="true"/> : <Moon size={19} aria-hidden="true"/>}
      </button>
      <button ref={toggle} type="button" className="home-menu" aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-controls="home-navigation" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <X aria-hidden="true"/> : <Menu aria-hidden="true"/>}
      </button>
    </div>
    <nav id="home-navigation" aria-label="Tool navigation" className={open ? 'is-open' : ''}>
      {toolPath && <Link href="/#tools" onClick={close}>All tools</Link>}
      {groups.map(([group, Icon]) => <section key={group}>
        <h2>{group}</h2>
        {siteTools.filter(tool => tool.group === group).map(tool => <Link href={`/${tool.slug}/`} key={tool.slug} prefetch={false} onClick={close}
          aria-current={toolPath === tool.slug ? 'page' : undefined}>
          <Icon size={15} aria-hidden="true"/>{tool.name}
        </Link>)}
      </section>)}
      <section><h2>About</h2>{company.map(([name, href]) => <Link key={href} href={href} onClick={close}>{name}</Link>)}</section>
    </nav>
  </header>;
}

export function HomeSearch() {
  const { query, setQuery } = useToolSearch();
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        input.current?.focus();
      }
    }
    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  return <form role="search" className="home-search" onSubmit={event => {
    event.preventDefault();
    document.querySelector<HTMLElement>('#tools')?.focus();
  }}>
    <label>
      <Search size={18} aria-hidden="true"/>
      <input ref={input} type="search" aria-label="Search tools in hero" placeholder="Search Tools"
        aria-controls="tools" value={query} onChange={event => setQuery(event.target.value)}/>
      <kbd>Ctrl K</kbd>
    </label>
  </form>;
}

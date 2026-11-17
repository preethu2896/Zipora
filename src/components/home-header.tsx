'use client';

import Link from 'next/link';
import { BookOpen, FileText, House, Image, Menu, Moon, Plus, Search, Sun, Wrench, X } from 'lucide-react';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { flushSync } from 'react-dom';
import { siteTools } from '@/lib/site-content';
import { useToolSearch } from './tool-search';

const groups = [['PDF Tools', FileText], ['Image Tools', Image], ['Other Tools', Wrench]] as const;
const company = [['About', '/about/'], ['Contact', '/contact/'], ['Blog', '/blog/'], ['Privacy Policy', '/privacy-policy/'], ['Terms', '/terms/'], ['Security & Privacy', '/security-and-privacy/']];
const companyNavigation = [...company, ['Advertise', '/advertise/'], ['Compare', '/compare/']];
const themeKey = 'zipora-home-theme';

export function HomeHeader({ toolPath, companyPath }: { toolPath?: string; companyPath?: string }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [pastHero, setPastHero] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const { setQuery } = useToolSearch();
  const isInnerPage = Boolean(toolPath || companyPath);

  useEffect(() => {
    try {
      setDark(localStorage.getItem(themeKey) === 'dark');
    } catch {
      // The toggle still works when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (isInnerPage) return;
    const hero = document.querySelector('.home-intro');
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => {
      setPastHero(!entry.isIntersecting && entry.boundingClientRect.bottom <= 64);
    }, { rootMargin: '-64px 0px 0px 0px' });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [isInnerPage]);

  function switchTheme(event: MouseEvent<HTMLButtonElement>) {
    const nextDark = !dark;
    const root = document.documentElement;
    if (root.hasAttribute('data-theme-transition')) return;
    if (document.startViewTransition && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const button = event.currentTarget.getBoundingClientRect();
      const x = button.left + button.width / 2;
      const y = button.top + button.height / 2;
      const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
      root.setAttribute('data-theme-transition', '');
      const transition = document.startViewTransition(() => flushSync(() => setDark(nextDark)));
      void transition.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 440, easing: 'cubic-bezier(.22,.61,.36,1)', pseudoElement: '::view-transition-new(root)' },
        );
      }).catch(() => {});
      void transition.finished.catch(() => {}).finally(() => root.removeAttribute('data-theme-transition'));
    } else {
      setDark(nextDark);
    }
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

  return <header className={isInnerPage ? 'home-sidebar tool-site-sidebar' : 'home-sidebar'} data-theme={dark ? 'dark' : 'light'}
    data-navigation={isInnerPage ? 'page' : pastHero ? 'floating' : 'hero'}>
    <div className="home-sidebar-top">
      <Link href={isInnerPage ? '/' : '#top'} className="home-wordmark zipora-brand-lockup" onClick={close}>
        <img src="/logo.png" width={32} height={32} alt=""/>Zipora
      </Link>
      <nav className="home-quick-navigation" aria-label="Quick links">
        <Link href="/#popular-tools" onClick={close}>Explore</Link>
        <Link href="/blog/" onClick={close}>Blog</Link>
        <Link href="/#faq" onClick={close}>FAQ</Link>
      </nav>
      <div className="home-top-actions">
        <Link className="home-nav-link" href="/advertise/" onClick={close}><Plus size={16} strokeWidth={1.5} aria-hidden="true"/> Sponsor Zipora</Link>
        <Link className="home-nav-link home-nav-count" href="/#tools" onClick={close}><Wrench size={16} strokeWidth={1.5} aria-hidden="true"/> {siteTools.length} tools</Link>
        <Link className="home-nav-link home-nav-blog" href="/blog/" onClick={close}><BookOpen size={16} strokeWidth={1.5} aria-hidden="true"/> Blog</Link>
        <Link className="home-nav-link home-nav-explore" href="/#tools" onClick={close}>Explore tools</Link>
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
    </div>
    <nav id="home-navigation" aria-label="Tool navigation" className={open ? 'is-open' : ''}>
      <Link href={isInnerPage ? '/' : '#top'} onClick={close} aria-current={isInnerPage ? undefined : 'page'}><House size={15} aria-hidden="true"/>Home</Link>
      {groups.map(([group, Icon]) => <section key={group}>
        <h2>{group}</h2>
        {siteTools.filter(tool => tool.group === group).map(tool => <Link href={`/${tool.slug}/`} key={tool.slug} prefetch={false} onClick={close}
          aria-current={toolPath === tool.slug ? 'page' : undefined}>
          <Icon size={15} aria-hidden="true"/>{tool.name}
        </Link>)}
      </section>)}
      <section><h2>Company</h2>{companyNavigation.map(([name, href]) => <Link key={href} href={href} onClick={close}
        aria-current={companyPath === href ? 'page' : undefined}>{name}</Link>)}</section>
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
      <input ref={input} type="search" aria-label="Search tools" placeholder="Search tools"
        aria-controls="tools" value={query} onChange={event => setQuery(event.target.value)}/>
      <kbd>Ctrl K</kbd>
    </label>
  </form>;
}

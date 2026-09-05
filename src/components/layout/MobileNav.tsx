import { useEffect, useState } from 'react';
import { IconClockHour4, IconHeart, IconMap, IconSearch } from '@tabler/icons-react';

interface NavItem {
  label: string;
  icon: typeof IconSearch;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Search', icon: IconSearch, href: '/' },
  { label: 'Map', icon: IconMap, href: '/search' },
  { label: 'Timeline', icon: IconClockHour4, href: '/timeline' },
  { label: 'Favorites', icon: IconHeart, href: '/favorites' },
];

export function MobileNav() {
  const [active, setActive] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );

  useEffect(() => {
    const syncPath = () => setActive(window.location.pathname);
    syncPath();
    document.addEventListener('astro:page-load', syncPath);
    return () => document.removeEventListener('astro:page-load', syncPath);
  }, []);

  return (
    <nav className="app-chrome-nav fixed right-0 bottom-0 left-0 z-nav flex h-[calc(72px+env(safe-area-inset-bottom))] items-center justify-around border-t border-slate-950/8 bg-white/94 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:hidden dark:border-white/8 dark:bg-[#070b12]/94">
      {navItems.map((item) => {
        const isActive = active === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            data-astro-prefetch
            className={`relative flex min-h-13 min-w-16 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[0.68rem] font-semibold text-slate-500 no-underline transition duration-150 hover:bg-slate-950/4 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-white/58 dark:hover:bg-white/8 dark:hover:text-white ${
              isActive ? 'text-slate-950 dark:text-amber-100' : ''
            }`}
            onClick={() => setActive(item.href)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && <span className="absolute top-0 h-0.75 w-7 rounded-b-full bg-amber-500" />}
            <span
              className={`inline-flex h-7 w-10 items-center justify-center rounded-full ${isActive ? 'bg-amber-400/20 dark:bg-amber-300/14' : ''}`}
            >
              <item.icon size={21} stroke={isActive ? 2.2 : 1.8} />
            </span>
            <span className="leading-tight">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

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
    <nav className="app-chrome-nav fixed right-0 bottom-0 left-0 z-nav flex h-[calc(64px+env(safe-area-inset-bottom))] items-center justify-around border-t border-slate-950/8 bg-white/92 pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_32px_rgba(15,23,42,0.1)] backdrop-blur-xl sm:hidden dark:border-white/10 dark:bg-slate-950/92">
      {navItems.map((item) => {
        const isActive = active === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            data-astro-prefetch
            className={`flex min-h-11 min-w-16 flex-col items-center justify-center gap-0.5 rounded-2xl text-xs font-medium text-slate-500 no-underline transition duration-150 hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-white/62 dark:hover:bg-white/10 dark:hover:text-white ${
              isActive
                ? 'bg-amber-400/18 font-bold text-slate-950 ring-1 ring-amber-500/20 dark:bg-amber-300/14 dark:text-amber-100 dark:ring-amber-200/20'
                : ''
            }`}
            onClick={() => setActive(item.href)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="inline-flex items-center justify-center">
              <item.icon size={24} />
            </span>
            <span className="leading-tight">{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

import { useEffect, useState } from 'react';
import {
  IconSearch,
  IconMap,
  IconHeart,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
} from '@tabler/icons-react';
import { useThemePreference } from '@/hooks/useThemePreference';

interface NavItem {
  label: string;
  icon: typeof IconSearch;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Search', icon: IconSearch, href: '/' },
  { label: 'Map', icon: IconMap, href: '/search' },
  { label: 'Favorites', icon: IconHeart, href: '/favorites' },
];

export function Navigation() {
  const [active, setActive] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
  const { preference, cyclePreference } = useThemePreference();

  useEffect(() => {
    const syncPath = () => setActive(window.location.pathname);
    syncPath();
    document.addEventListener('astro:page-load', syncPath);
    return () => document.removeEventListener('astro:page-load', syncPath);
  }, []);

  const colorSchemeIcon =
    preference === 'light' ? (
      <IconSun size={20} />
    ) : preference === 'dark' ? (
      <IconMoon size={20} />
    ) : (
      <IconDeviceDesktop size={20} />
    );

  return (
    <nav className="app-chrome-nav fixed top-0 bottom-0 left-0 z-nav hidden w-16 flex-col items-center justify-between border-r border-slate-950/8 bg-white/86 py-4 shadow-[0_8px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:flex dark:border-white/10 dark:bg-slate-950/84">
      <div className="flex flex-col items-center gap-3">
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-xs font-extrabold tracking-normal text-white shadow-[0_14px_28px_rgba(15,23,42,0.22)] ring-1 ring-white/30 dark:bg-white dark:text-slate-950">
          TAS
        </div>
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            data-astro-prefetch
            className={`relative flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 transition duration-150 hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-white/64 dark:hover:bg-white/10 dark:hover:text-white ${
              active === item.href
                ? 'bg-amber-400/18 text-slate-950 ring-1 ring-amber-500/24 hover:bg-amber-400/22 dark:bg-amber-300/14 dark:text-amber-100 dark:ring-amber-200/20'
                : ''
            }`}
            onClick={() => setActive(item.href)}
            aria-label={item.label}
            aria-current={active === item.href ? 'page' : undefined}
            title={item.label}
          >
            <span className="inline-flex items-center justify-center">
              <item.icon size={22} />
            </span>
          </a>
        ))}
      </div>
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 transition duration-150 hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-white/64 dark:hover:bg-white/10 dark:hover:text-white"
        onClick={cyclePreference}
        aria-label={`Theme: ${preference}`}
        title={`Theme: ${preference}`}
      >
        <span className="inline-flex items-center justify-center">{colorSchemeIcon}</span>
      </button>
    </nav>
  );
}

import { useEffect, useState } from 'react';
import { IconSearch, IconMap, IconHeart, IconClockHour4 } from '@tabler/icons-react';
import { Pill, PillIndicator } from '@/components/kibo-ui/pill';
import { ThemeToggle } from './ThemeToggle';
import type { VersionResponse } from '@/types/api';

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

function isActivePath(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isVersionResponse(value: unknown): value is VersionResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'displayVersion' in value &&
    typeof value.displayVersion === 'string'
  );
}

export function Navigation() {
  const [active, setActive] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );
  const [version, setVersion] = useState<VersionResponse | null>(null);

  useEffect(() => {
    const syncPath = () => setActive(window.location.pathname);
    syncPath();
    document.addEventListener('astro:page-load', syncPath);
    return () => document.removeEventListener('astro:page-load', syncPath);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/version', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        if (isVersionResponse(data)) setVersion(data);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.warn('Unable to load Worker version metadata', error);
        }
      });

    return () => controller.abort();
  }, []);

  return (
    <nav className="app-chrome-nav fixed top-0 bottom-0 left-0 z-nav hidden w-18 flex-col items-center justify-between border-r border-slate-950/8 bg-white/88 py-4 shadow-[8px_0_32px_rgba(15,23,42,0.045)] backdrop-blur-2xl md:flex dark:border-border dark:bg-popover">
      <div className="flex flex-col items-center gap-3">
        <a
          href="/"
          aria-label="Tasmania Aerial Photo Explorer home"
          className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] ring-1 ring-white/30 transition hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:bg-white dark:text-slate-950"
        >
          TAS
        </a>
        {navItems.map((item) => {
          const itemActive = isActivePath(active, item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              data-astro-prefetch
              className={`relative flex h-16 w-14 flex-col items-center justify-center gap-1 rounded-lg text-slate-500 transition duration-150 hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-white/60 dark:hover:bg-white/8 dark:hover:text-white ${
                itemActive
                  ? 'bg-amber-400/18 text-slate-950 ring-1 ring-amber-500/24 hover:bg-amber-400/22 dark:bg-amber-300/14 dark:text-amber-100 dark:ring-amber-200/20'
                  : ''
              }`}
              onClick={() => setActive(item.href)}
              aria-label={item.label}
              aria-current={itemActive ? 'page' : undefined}
              title={item.label}
            >
              {itemActive && (
                <span className="absolute -left-[0.55rem] h-5 w-0.75 rounded-r-full bg-amber-500" />
              )}
              <item.icon size={21} stroke={1.8} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </a>
          );
        })}
      </div>
      <div className="flex flex-col items-center gap-2">
        <ThemeToggle />
        <Pill
          className="max-w-[3.25rem] gap-1 truncate border-border bg-card/72 px-1.5 py-1 text-[0.62rem] leading-none font-bold text-muted-foreground shadow-sm backdrop-blur-xl"
          title={
            version?.workerVersion.id
              ? `Worker ${version.workerVersion.id}${version.workerVersion.timestamp ? ` · ${version.workerVersion.timestamp}` : ''}`
              : 'Worker version metadata unavailable locally'
          }
          aria-label={`Worker build version ${version?.displayVersion ?? 'loading'}`}
        >
          <PillIndicator variant={version ? 'success' : 'info'} />
          {version?.displayVersion ?? '...'}
        </Pill>
      </div>
    </nav>
  );
}

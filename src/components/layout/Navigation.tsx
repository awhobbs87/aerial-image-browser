import { useEffect, useState } from 'react';
import {
  ClockCounterClockwiseIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  SidebarSimpleIcon,
  type Icon,
} from '@phosphor-icons/react';
import { Sidebar } from '@cloudflare/kumo/components/sidebar';
import { Button } from '@cloudflare/kumo/components/button';
import { Badge } from '@cloudflare/kumo/components/badge';
import { ThemeToggle } from './ThemeToggle';
import type { VersionResponse } from '@/types/api';

interface NavItem {
  label: string;
  icon: Icon;
  href: string;
}

const navItems: NavItem[] = [
  { label: 'Search', icon: MagnifyingGlassIcon, href: '/' },
  { label: 'Map', icon: MapTrifoldIcon, href: '/search' },
  { label: 'Timeline', icon: ClockCounterClockwiseIcon, href: '/timeline' },
  { label: 'Favorites', icon: HeartIcon, href: '/favorites' },
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(260);

  useEffect(() => {
    const syncPath = () => setActive(window.location.pathname);
    syncPath();
    document.addEventListener('astro:page-load', syncPath);
    return () => document.removeEventListener('astro:page-load', syncPath);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const desktop = window.matchMedia('(min-width: 48em)');
    const syncWidth = () => {
      root.style.setProperty(
        '--sidebar-width',
        desktop.matches ? `${sidebarOpen ? sidebarWidth : 57}px` : '0px',
      );
    };
    syncWidth();
    desktop.addEventListener('change', syncWidth);
    return () => {
      desktop.removeEventListener('change', syncWidth);
      root.style.removeProperty('--sidebar-width');
    };
  }, [sidebarOpen, sidebarWidth]);

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
    <Sidebar.Provider
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
      collapsible="icon"
      resizable
      defaultWidth={260}
      minWidth={200}
      maxWidth={360}
      onWidthChange={setSidebarWidth}
      mobileBreakpoint={1}
      style={{ width: `${sidebarOpen ? sidebarWidth : 57}px` }}
      className="app-chrome-nav fixed inset-y-0 left-0 z-nav hidden md:flex"
    >
      <Sidebar aria-label="Primary navigation">
        <Sidebar.Content>
          <Sidebar.Group>
            <Sidebar.Menu>
              {navItems.map((item) => {
                const itemActive = isActivePath(active, item.href);
                return (
                  <Sidebar.MenuButton
                    key={item.href}
                    href={item.href}
                    data-astro-prefetch
                    icon={item.icon}
                    active={itemActive}
                    className="min-h-11"
                    onClick={() => setActive(item.href)}
                    aria-label={item.label}
                    aria-current={itemActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Sidebar.MenuButton>
                );
              })}
            </Sidebar.Menu>
          </Sidebar.Group>
        </Sidebar.Content>
        <Sidebar.Footer className="h-auto min-h-16 justify-between py-2 group-data-[state=collapsed]/sidebar:justify-center">
          <Button
            type="button"
            variant="ghost"
            shape="square"
            icon={SidebarSimpleIcon}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            onClick={() => setSidebarOpen((open) => !open)}
          />
          <div className="group-data-[state=collapsed]/sidebar:hidden">
            <ThemeToggle />
          </div>
          <span
            className="max-w-32 gap-1.5 truncate border-border bg-card/72 px-2 py-1 text-xs leading-none font-bold text-muted-foreground shadow-sm group-data-[state=collapsed]/sidebar:hidden"
            title={
              version?.workerVersion.id
                ? `Worker ${version.workerVersion.id}${version.workerVersion.timestamp ? ` · ${version.workerVersion.timestamp}` : ''}`
                : 'Worker version metadata unavailable locally'
            }
            aria-label={`Worker build version ${version?.displayVersion ?? 'loading'}`}
          >
            <Badge variant={version ? 'success' : 'neutral'} appearance="dot">
              {version?.displayVersion ?? '...'}
            </Badge>
          </span>
        </Sidebar.Footer>
        <Sidebar.ResizeHandle />
      </Sidebar>
    </Sidebar.Provider>
  );
}

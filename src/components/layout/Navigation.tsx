import { useEffect, useState } from 'react';
import {
  ClockCounterClockwiseIcon,
  HeartIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  CaretLeftIcon,
  CaretRightIcon,
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

export function Navigation({ initialPath = '/' }: { initialPath?: string }) {
  const [active, setActive] = useState(initialPath);
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
    document.addEventListener('astro:after-swap', syncWidth);
    return () => {
      desktop.removeEventListener('change', syncWidth);
      document.removeEventListener('astro:after-swap', syncWidth);
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
      contained
      resizable
      defaultWidth={260}
      minWidth={200}
      maxWidth={360}
      onWidthChange={setSidebarWidth}
      animationDuration={0}
      mobileBreakpoint={1}
      style={{ width: `${sidebarOpen ? sidebarWidth : 57}px` }}
      className="app-chrome-nav fixed inset-y-0 left-0 z-nav hidden [--sidebar-footer-height:4rem] data-[state=collapsed]:[--sidebar-footer-height:7rem] md:flex"
    >
      <Sidebar id="desktop-sidebar" aria-label="Primary navigation">
        <Sidebar.Content className="mb-(--sidebar-footer-height)">
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
      </Sidebar>
      <Sidebar.ResizeHandle className="inset-y-auto top-0 bottom-(--sidebar-footer-height) z-50 min-w-0!" />
      <div
        className={`absolute inset-x-0 bottom-0 z-50 flex h-(--sidebar-footer-height) items-center gap-2 border-t border-kumo-line bg-kumo-base py-1.5 ${
          sidebarOpen ? 'justify-between px-2' : 'flex-col justify-center'
        }`}
      >
        <Button
          type="button"
          variant="ghost"
          shape="square"
          icon={sidebarOpen ? CaretLeftIcon : CaretRightIcon}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={sidebarOpen}
          aria-controls="desktop-sidebar"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="size-11 shrink-0 rounded-xl bg-kumo-tint text-kumo-default hover:bg-kumo-recessed focus-visible:ring-inset"
          onClick={() => setSidebarOpen((open) => !open)}
        />
        <ThemeToggle compact={!sidebarOpen} />
        {sidebarOpen && (
          <span
            className="min-w-0"
            title={
              version?.workerVersion.id
                ? `Worker ${version.workerVersion.id}${version.workerVersion.timestamp ? ` · ${version.workerVersion.timestamp}` : ''}`
                : 'Worker version metadata unavailable locally'
            }
            aria-label={`Worker build version ${version?.displayVersion ?? 'loading'}`}
          >
            <Badge
              variant={version ? 'success' : 'neutral'}
              appearance="dot"
              className="max-w-full bg-kumo-tint px-2 py-1 ring-0"
            >
              <span className="truncate">{version?.displayVersion ?? '...'}</span>
            </Badge>
          </span>
        )}
      </div>
    </Sidebar.Provider>
  );
}

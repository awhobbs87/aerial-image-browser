import { useState } from 'react';
import {
  IconSearch,
  IconMap,
  IconHeart,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
} from '@tabler/icons-react';
import classes from './Navigation.module.css';

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
  const [colorScheme, setColorScheme] = useState<'light' | 'dark' | 'auto'>(() => {
    if (typeof document === 'undefined') return 'auto';
    const current = document.documentElement.getAttribute('data-mantine-color-scheme') ?? 'auto';
    return current === 'light' || current === 'dark' || current === 'auto' ? current : 'auto';
  });

  const cycleColorScheme = () => {
    const next = colorScheme === 'light' ? 'dark' : colorScheme === 'dark' ? 'auto' : 'light';
    setColorScheme(next);
    document.documentElement.setAttribute('data-mantine-color-scheme', next);
    window.localStorage.setItem('mantine-color-scheme-value', next);
  };

  const colorSchemeIcon =
    colorScheme === 'light' ? (
      <IconSun size={20} />
    ) : colorScheme === 'dark' ? (
      <IconMoon size={20} />
    ) : (
      <IconDeviceDesktop size={20} />
    );

  return (
    <nav className={classes.nav}>
      <div className={classes.group}>
        <div className={classes.logo}>TAS</div>
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`${classes.iconButton} ${active === item.href ? classes.active : ''}`}
            onClick={() => setActive(item.href)}
            aria-label={item.label}
            aria-current={active === item.href ? 'page' : undefined}
            title={item.label}
          >
            <span className={classes.iconWrap}>
              <item.icon size={22} />
            </span>
          </a>
        ))}
      </div>
      <button
        type="button"
        className={classes.iconButton}
        onClick={cycleColorScheme}
        aria-label={`Theme: ${colorScheme}`}
        title={`Theme: ${colorScheme}`}
      >
        <span className={classes.iconWrap}>{colorSchemeIcon}</span>
      </button>
    </nav>
  );
}

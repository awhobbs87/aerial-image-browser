import { useState } from 'react';
import { ActionIcon, Text } from '@mantine/core';
import { IconSearch, IconMap, IconHeart } from '@tabler/icons-react';
import classes from './MobileNav.module.css';

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

export function MobileNav() {
  const [active, setActive] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );

  return (
    <nav className={classes.nav}>
      {navItems.map((item) => {
        const isActive = active === item.href;
        return (
          <a
            key={item.href}
            href={item.href}
            className={`${classes.item} ${isActive ? classes.active : ''}`}
            onClick={() => setActive(item.href)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <ActionIcon variant="transparent" color={isActive ? 'emerald' : 'gray'} size="lg">
              <item.icon size={24} />
            </ActionIcon>
            <Text size="xs" c={isActive ? 'emerald' : 'dimmed'} fw={isActive ? 600 : 400}>
              {item.label}
            </Text>
          </a>
        );
      })}
    </nav>
  );
}

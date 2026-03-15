import { useState } from 'react';
import { ActionIcon, Stack, Tooltip, useMantineColorScheme } from '@mantine/core';
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
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [active, setActive] = useState(
    typeof window !== 'undefined' ? window.location.pathname : '/',
  );

  const cycleColorScheme = () => {
    const next = colorScheme === 'light' ? 'dark' : colorScheme === 'dark' ? 'auto' : 'light';
    setColorScheme(next);
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
      <Stack gap="xs" align="center">
        <div className={classes.logo}>TAS</div>
        {navItems.map((item) => (
          <Tooltip key={item.href} label={item.label} position="right" withArrow>
            <ActionIcon
              component="a"
              href={item.href}
              variant={active === item.href ? 'filled' : 'subtle'}
              color={active === item.href ? 'emerald' : 'gray'}
              size="xl"
              onClick={() => setActive(item.href)}
            >
              <item.icon size={22} />
            </ActionIcon>
          </Tooltip>
        ))}
      </Stack>
      <Tooltip label={`Theme: ${colorScheme}`} position="right" withArrow>
        <ActionIcon variant="subtle" size="xl" onClick={cycleColorScheme} color="gray">
          {colorSchemeIcon}
        </ActionIcon>
      </Tooltip>
    </nav>
  );
}

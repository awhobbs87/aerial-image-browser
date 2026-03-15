import { ActionIcon, Tooltip, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';

export function ThemeToggle() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  const cycleColorScheme = () => {
    const next = colorScheme === 'light' ? 'dark' : colorScheme === 'dark' ? 'auto' : 'light';
    setColorScheme(next);
  };

  const icon =
    colorScheme === 'light' ? <IconSun size={18} /> :
    colorScheme === 'dark' ? <IconMoon size={18} /> :
    <IconDeviceDesktop size={18} />;

  const label = `Theme: ${colorScheme}`;

  return (
    <Tooltip label={label} withArrow>
      <ActionIcon variant="subtle" size="lg" onClick={cycleColorScheme} color="gray" aria-label={label}>
        {icon}
      </ActionIcon>
    </Tooltip>
  );
}

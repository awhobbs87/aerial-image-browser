import { DesktopIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import { Button } from '@cloudflare/kumo/components/button';
import { Popover } from '@cloudflare/kumo/components/popover';
import { Tabs } from '@cloudflare/kumo/components/tabs';
import { useThemePreference } from '@/hooks/useThemePreference';

export function ThemeToggle() {
  const { preference, setThemePreference } = useThemePreference();

  const Icon = preference === 'light' ? SunIcon : preference === 'dark' ? MoonIcon : DesktopIcon;

  const label = `Theme: ${preference}`;

  return (
    <Popover>
      <Popover.Trigger
        render={<Button variant="ghost" shape="square" icon={Icon} aria-label={label} />}
      >
        <span className="sr-only">{label}</span>
      </Popover.Trigger>
      <Popover.Content side="top" align="start" className="relative z-dropdown w-72">
        <Popover.Title>Appearance</Popover.Title>
        <Popover.Description>Choose how the explorer is displayed.</Popover.Description>
        <Tabs
          className="mt-3"
          activateOnFocus
          value={preference === 'auto' ? 'system' : preference}
          onValueChange={(theme) =>
            setThemePreference(theme === 'system' ? 'auto' : (theme as 'light' | 'dark'))
          }
          tabs={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
      </Popover.Content>
    </Popover>
  );
}

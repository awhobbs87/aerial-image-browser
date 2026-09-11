import * as PopoverPrimitive from '@radix-ui/react-popover';
import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';
import { ThemeSwitcher } from '@/components/kibo-ui/theme-switcher';
import { useThemePreference } from '@/hooks/useThemePreference';

export function ThemeToggle() {
  const { preference, setThemePreference } = useThemePreference();

  const icon =
    preference === 'light' ? (
      <IconSun size={18} />
    ) : preference === 'dark' ? (
      <IconMoon size={18} />
    ) : (
      <IconDeviceDesktop size={18} />
    );

  const label = `Theme: ${preference}`;

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 transition duration-150 hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-white/60 dark:hover:bg-white/8 dark:hover:text-white"
        >
          {icon}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="right"
          sideOffset={10}
          align="end"
          className="z-dropdown rounded-lg border border-border bg-popover/94 p-2 text-popover-foreground shadow-[0_18px_50px_rgba(15,23,42,0.2)] backdrop-blur-2xl"
        >
          <p className="px-1 pb-2 text-[11px] font-semibold text-muted-foreground">Appearance</p>
          <ThemeSwitcher
            value={preference === 'auto' ? 'system' : preference}
            onChange={(theme) => setThemePreference(theme === 'system' ? 'auto' : theme)}
          />
          <PopoverPrimitive.Arrow className="fill-popover" />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

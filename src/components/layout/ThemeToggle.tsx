import { IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';
import { useThemePreference } from '@/hooks/useThemePreference';
import { Tooltip } from '@/components/ui/Tooltip';

export function ThemeToggle() {
  const { preference, cyclePreference } = useThemePreference();

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
    <Tooltip label={label}>
      <button
        type="button"
        onClick={cyclePreference}
        aria-label={label}
        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
      >
        {icon}
      </button>
    </Tooltip>
  );
}

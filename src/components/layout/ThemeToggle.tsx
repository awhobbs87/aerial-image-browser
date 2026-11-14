import { CaretDownIcon, DesktopIcon, MoonIcon, SunIcon } from '@phosphor-icons/react';
import { Button } from '@cloudflare/kumo/components/button';
import { DropdownMenu } from '@cloudflare/kumo/components/dropdown';
import { useThemePreference } from '@/hooks/useThemePreference';

const themes = {
  auto: { label: 'System', icon: DesktopIcon },
  light: { label: 'Light', icon: SunIcon },
  dark: { label: 'Dark', icon: MoonIcon },
} as const;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setThemePreference } = useThemePreference();
  const { label, icon: Icon } = themes[preference];

  return (
    <DropdownMenu modal={false}>
      <DropdownMenu.Trigger
        render={
          <Button
            variant="ghost"
            aria-label={`Theme: ${label}`}
            title={`Theme: ${label}`}
            className={`h-11 shrink-0 justify-center gap-1.5 rounded-xl bg-kumo-tint text-kumo-default hover:bg-kumo-recessed focus-visible:ring-inset aria-expanded:bg-kumo-recessed ${compact ? 'w-11 px-0' : ''}`}
          />
        }
      >
        <Icon size={18} aria-hidden="true" />
        {!compact && (
          <>
            <span className="text-xs font-semibold">{label}</span>
            <CaretDownIcon size={12} aria-hidden="true" />
          </>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        positionMethod="fixed"
        side={compact ? 'right' : 'top'}
        align={compact ? 'end' : 'start'}
        style={{ zIndex: 'var(--z-index-dropdown)' }}
        className="min-w-44 rounded-xl bg-kumo-base p-1.5 shadow-lg ring-inset motion-reduce:animate-none"
      >
        <DropdownMenu.Group>
          <DropdownMenu.Label className="px-2 py-1 text-xs font-semibold text-kumo-subtle">
            Appearance
          </DropdownMenu.Label>
          <DropdownMenu.RadioGroup
            value={preference}
            onValueChange={(value) => setThemePreference(value as keyof typeof themes)}
          >
            {Object.entries(themes).map(([value, theme]) => (
              <DropdownMenu.RadioItem
                key={value}
                value={value}
                icon={theme.icon}
                className="min-h-11 cursor-pointer gap-1 px-2 text-sm data-checked:font-semibold"
              >
                {theme.label}
                <DropdownMenu.RadioItemIndicator className="text-kumo-brand" />
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu>
  );
}

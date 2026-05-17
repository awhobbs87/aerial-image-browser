import { useThemePreference } from '@/hooks/useThemePreference';

/** Keeps theme in sync on every page (incl. mobile) across view transitions. */
export function ThemeSyncIsland() {
  useThemePreference();
  return null;
}

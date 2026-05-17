import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  applyTheme,
  getStoredPreference,
  setPreference,
  subscribeToResolvedTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme';

function subscribePreference(onStoreChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === 'theme-preference') onStoreChange();
  };
  window.addEventListener('storage', onStorage);
  document.addEventListener('theme-preference-change', onStoreChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('theme-preference-change', onStoreChange);
  };
}

function getPreferenceSnapshot(): ThemePreference {
  return getStoredPreference();
}

export function useThemePreference() {
  const preference = useSyncExternalStore(
    subscribePreference,
    getPreferenceSnapshot,
    () => 'auto' as ThemePreference,
  );

  const resolved = useSyncExternalStore(
    subscribeToResolvedTheme,
    () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'),
    () => 'light' as ResolvedTheme,
  );

  useEffect(() => {
    applyTheme(getStoredPreference());

    const syncOnNavigate = () => applyTheme(getStoredPreference());
    document.addEventListener('astro:page-load', syncOnNavigate);
    document.addEventListener('astro:after-swap', syncOnNavigate);
    return () => {
      document.removeEventListener('astro:page-load', syncOnNavigate);
      document.removeEventListener('astro:after-swap', syncOnNavigate);
    };
  }, []);

  const setThemePreference = useCallback((next: ThemePreference) => {
    setPreference(next);
    document.dispatchEvent(new Event('theme-preference-change'));
  }, []);

  const cyclePreference = useCallback(() => {
    const next: ThemePreference =
      preference === 'light' ? 'dark' : preference === 'dark' ? 'auto' : 'light';
    setThemePreference(next);
  }, [preference, setThemePreference]);

  return { preference, resolved, setThemePreference, cyclePreference };
}

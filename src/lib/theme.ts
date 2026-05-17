export type ThemePreference = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme-preference';
export const THEME_EXPLICIT_KEY = 'theme-preference-explicit';

export function getStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'auto';
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  const explicit = window.localStorage.getItem(THEME_EXPLICIT_KEY) === 'true';
  if (!explicit) return 'auto';
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  return 'auto';
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') return preference;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Apply resolved theme to <html> and record the user's preference mode. */
export function applyTheme(preference: ThemePreference): ResolvedTheme {
  if (typeof document === 'undefined') return resolveTheme(preference);
  const resolved = resolveTheme(preference);
  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-preference', preference);
  root.classList.toggle('dark', resolved === 'dark');
  return resolved;
}

export function setPreference(preference: ThemePreference): ResolvedTheme {
  window.localStorage.setItem(THEME_EXPLICIT_KEY, 'true');
  window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  return applyTheme(preference);
}

export function isResolvedDark(): boolean {
  if (typeof document === 'undefined') return false;
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

export function subscribeToResolvedTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const notify = () => onChange(resolveTheme(getStoredPreference()));

  const onPreferenceStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) notify();
  };

  const onSystemChange = () => {
    if (getStoredPreference() === 'auto') notify();
  };

  const observer = new MutationObserver(() => {
    onChange(isResolvedDark() ? 'dark' : 'light');
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class'],
  });

  media.addEventListener('change', onSystemChange);
  window.addEventListener('storage', onPreferenceStorage);
  document.addEventListener('theme-preference-change', notify);

  return () => {
    observer.disconnect();
    media.removeEventListener('change', onSystemChange);
    window.removeEventListener('storage', onPreferenceStorage);
    document.removeEventListener('theme-preference-change', notify);
  };
}

import { resolveTheme, type ThemePreference } from './theme';

/** Inline script source — must stay in sync with theme.ts resolve/apply rules. */
export function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'auto';
  const stored = window.localStorage.getItem('theme-preference');
  const explicit = window.localStorage.getItem('theme-preference-explicit') === 'true';
  if (!explicit) return 'auto';
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  return 'auto';
}

export function resolveStoredTheme(): 'light' | 'dark' {
  return resolveTheme(readStoredPreference());
}

/** Apply resolved theme to a document root (current or incoming during view transitions). */
export function applyThemeToRoot(root: HTMLElement, preference?: ThemePreference): void {
  const pref = preference ?? readStoredPreference();
  const resolved = resolveTheme(pref);
  root.setAttribute('data-theme', resolved);
  root.setAttribute('data-theme-preference', pref);
  root.classList.toggle('dark', resolved === 'dark');
}

/** Copy active theme onto the incoming document before Astro swaps DOM. */
export function transferThemeBeforeSwap(event: Event): void {
  const swapEvent = event as CustomEvent<{ newDocument?: Document }>;
  const newDoc = swapEvent.detail?.newDocument;
  if (!newDoc) return;
  applyThemeToRoot(newDoc.documentElement, readStoredPreference());
}

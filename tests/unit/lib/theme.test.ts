import { describe, expect, it, beforeEach } from 'vitest';
import {
  applyTheme,
  getStoredPreference,
  resolveTheme,
  setPreference,
  THEME_EXPLICIT_KEY,
  THEME_STORAGE_KEY,
} from '@/lib/theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('data-theme-preference');
  });

  it('defaults to auto when nothing stored', () => {
    expect(getStoredPreference()).toBe('auto');
  });

  it('treats stale stored preferences as auto unless explicitly set', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');

    expect(getStoredPreference()).toBe('auto');
  });

  it('reads stored preferences when marked explicit', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light');
    localStorage.setItem(THEME_EXPLICIT_KEY, 'true');

    expect(getStoredPreference()).toBe('light');
  });

  it('resolves auto from system preference', () => {
    const darkMq = window.matchMedia('(prefers-color-scheme: dark)');
    const resolved = resolveTheme('auto');
    expect(resolved).toBe(darkMq.matches ? 'dark' : 'light');
  });

  it('applies resolved theme to documentElement', () => {
    applyTheme('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme-preference')).toBe('dark');
  });

  it('persists preference via setPreference', () => {
    setPreference('light');
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light');
    expect(localStorage.getItem(THEME_EXPLICIT_KEY)).toBe('true');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
});

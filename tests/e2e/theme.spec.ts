import { expect, test, type Page } from '@playwright/test';

function rgbChannels(value: string) {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) throw new Error(`Expected rgb()/rgba() color, got ${value}`);
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
  };
}

function luminance(value: string) {
  const { r, g, b } = rgbChannels(value);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function readThemeState(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const h1 = document.querySelector('h1');
    const lead = document.querySelector('h1 + p');
    const card = document.querySelector('aside > div');
    const searchFrame = document.querySelector('form[role="search"]')?.parentElement;

    if (!h1 || !lead || !card || !searchFrame) {
      throw new Error('Landing page theme probes were not found');
    }

    return {
      theme: root.getAttribute('data-theme'),
      preference: root.getAttribute('data-theme-preference'),
      hasDarkClass: root.classList.contains('dark'),
      storedPreference: localStorage.getItem('theme-preference'),
      explicitPreference: localStorage.getItem('theme-preference-explicit'),
      h1Color: getComputedStyle(h1).color,
      leadColor: getComputedStyle(lead).color,
      cardBg: getComputedStyle(card).backgroundColor,
      searchFrameBg: getComputedStyle(searchFrame).backgroundColor,
    };
  });
}

test.describe('theme detection and contrast', () => {
  test('system dark wins over stale implicit light preference', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => {
      localStorage.setItem('theme-preference', 'light');
      localStorage.removeItem('theme-preference-explicit');
    });

    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    const state = await readThemeState(page);
    expect(state).toMatchObject({
      theme: 'dark',
      preference: 'auto',
      hasDarkClass: true,
      storedPreference: 'light',
      explicitPreference: null,
    });
    expect(luminance(state.h1Color)).toBeGreaterThan(230);
    expect(luminance(state.leadColor)).toBeGreaterThan(150);
  });

  test('explicit light preference stays light even under system dark', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => {
      localStorage.setItem('theme-preference', 'light');
      localStorage.setItem('theme-preference-explicit', 'true');
    });

    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    const state = await readThemeState(page);
    expect(state).toMatchObject({
      theme: 'light',
      preference: 'light',
      hasDarkClass: false,
      storedPreference: 'light',
      explicitPreference: 'true',
    });
    expect(luminance(state.h1Color)).toBeLessThan(60);
    expect(luminance(state.leadColor)).toBeLessThan(120);
  });

  test('explicit dark preference stays dark even under system light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(() => {
      localStorage.setItem('theme-preference', 'dark');
      localStorage.setItem('theme-preference-explicit', 'true');
    });

    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();

    const state = await readThemeState(page);
    expect(state).toMatchObject({
      theme: 'dark',
      preference: 'dark',
      hasDarkClass: true,
      storedPreference: 'dark',
      explicitPreference: 'true',
    });
    expect(luminance(state.h1Color)).toBeGreaterThan(230);
    expect(luminance(state.leadColor)).toBeGreaterThan(150);
  });

  test('theme toggle writes an explicit user preference', async ({ page }) => {
    test.skip((page.viewportSize()?.width ?? 0) < 768, 'Theme toggle is in desktop nav');

    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript(() => {
      localStorage.removeItem('theme-preference');
      localStorage.removeItem('theme-preference-explicit');
    });

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Theme: auto' }).click();

    const state = await readThemeState(page);
    expect(state.explicitPreference).toBe('true');
    expect(state.storedPreference).toBe('light');
    expect(state.theme).toBe('light');
    expect(state.hasDarkClass).toBe(false);
  });
});

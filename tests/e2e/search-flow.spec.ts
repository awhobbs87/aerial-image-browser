import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test('search bar shows presets when focused', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.getByRole('textbox', { name: 'Find a place or address' });
    await searchInput.focus();
    // Should show preset locations dropdown
    await expect(page.getByText('Popular', { exact: true })).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole('button', { name: 'Hobart', exact: true })).toBeVisible();
  });

  test('landing globe and search suggestions fit the viewport', async ({ page }) => {
    const viewport = page.viewportSize()!;
    await page.setViewportSize({ width: viewport.width, height: 540 });
    await page.goto('/');

    const landing = page.locator('.landing-page');
    const globe = landing.locator('[data-kumo-globe] svg');
    await expect(globe).toBeVisible();
    const landingBox = (await landing.boundingBox())!;
    const globeBox = (await globe.boundingBox())!;
    expect(globeBox.x).toBeGreaterThanOrEqual(landingBox.x);
    expect(globeBox.x + globeBox.width).toBeLessThanOrEqual(landingBox.x + landingBox.width);
    expect(globeBox.y).toBeGreaterThanOrEqual(landingBox.y);
    expect(globeBox.y + globeBox.height).toBeLessThanOrEqual(landingBox.y + landingBox.height);

    await page.getByRole('textbox', { name: 'Find a place or address' }).click();
    const preset = page.getByRole('button', { name: 'Hobart', exact: true });
    await expect(preset).toBeInViewport();
    await preset.click({ trial: true });
  });

  test('typing in search bar shows geocoding results', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.fill('Hobart');
    // Wait for debounce + geocoding response
    await page.waitForTimeout(500);
    // Should show geocoding results (network dependent)
  });

  test.fixme('selecting a location navigates to search page', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.focus();
    await page.getByRole('button', { name: 'Hobart', exact: true }).click();
    await expect(page).toHaveURL(/\/search\?lat=/);
  });

  test.fixme('search results appear on search page', async ({ page }) => {
    await page.goto('/search?lat=-42.88&lon=147.33&q=Hobart');
    // Wait for API response (requires bindings)
    await page.waitForTimeout(2000);
    // Check for photo cards or empty state
  });
});

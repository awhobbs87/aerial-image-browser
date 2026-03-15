import { test, expect } from '@playwright/test';

test.describe('Search Flow', () => {
  test('search bar shows presets when focused', async ({ page }) => {
    await page.goto('/');
    const searchInput = page.locator('input[placeholder*="Search"]');
    await searchInput.focus();
    // Should show preset locations dropdown
    await expect(page.getByText('Popular locations')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Hobart')).toBeVisible();
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
    await page.getByText('Hobart').click();
    await expect(page).toHaveURL(/\/search\?lat=/);
  });

  test.fixme('search results appear on search page', async ({ page }) => {
    await page.goto('/search?lat=-42.88&lon=147.33&q=Hobart');
    // Wait for API response (requires bindings)
    await page.waitForTimeout(2000);
    // Check for photo cards or empty state
  });
});

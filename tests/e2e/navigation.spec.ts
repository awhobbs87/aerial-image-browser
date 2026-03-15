import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('landing page loads with title and search', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Tasmania Aerial Photo Explorer/);
    await expect(page.locator('h1')).toContainText('Tasmania Aerial');
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
  });

  test('search page loads', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveTitle(/Search/);
  });

  test('timeline page loads', async ({ page }) => {
    await page.goto('/timeline');
    await expect(page).toHaveTitle(/Timeline/);
    await expect(page.locator('h1')).toContainText('Timeline');
  });

  test('compare page loads', async ({ page }) => {
    await page.goto('/compare');
    await expect(page).toHaveTitle(/Compare/);
    await expect(page.locator('h1')).toContainText('Compare');
  });

  test('favorites page loads', async ({ page }) => {
    await page.goto('/favorites');
    await expect(page).toHaveTitle(/Favorites/);
  });

  test('desktop nav sidebar is visible on wide screens', async ({ page }) => {
    // Only runs in desktop project (1440px)
    await page.goto('/');
    if (page.viewportSize()!.width >= 768) {
      await expect(page.locator('nav')).toBeVisible();
    }
  });
});

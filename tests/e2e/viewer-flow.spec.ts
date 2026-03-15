import { test, expect } from '@playwright/test';

test.describe('Photo Viewer', () => {
  test.fixme('viewer page loads with image name in title', async ({ page }) => {
    await page.goto('/viewer/0/TEST_IMAGE');
    await expect(page).toHaveTitle(/TEST_IMAGE/);
  });

  test.fixme('viewer shows OpenSeadragon controls', async ({ page }) => {
    await page.goto('/viewer/0/TEST_IMAGE');
    // Wait for OSD to initialize
    await page.waitForTimeout(2000);
    // Check for zoom controls
    await expect(page.locator('[aria-label="Zoom in"]')).toBeVisible();
    await expect(page.locator('[aria-label="Zoom out"]')).toBeVisible();
  });
});

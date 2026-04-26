import { test } from '@playwright/test';

test.describe('Filters', () => {
  test.fixme('filter panel toggles on search page', async ({ page }) => {
    await page.goto('/search?lat=-42.88&lon=147.33&q=Hobart');
    // Click filter button
    // Verify filter panel appears
  });

  test.fixme('changing filters updates results', async ({ page }) => {
    await page.goto('/search?lat=-42.88&lon=147.33&q=Hobart');
    // Toggle a layer filter
    // Verify results change
  });
});

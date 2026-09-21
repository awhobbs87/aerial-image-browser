import { test, expect } from '@playwright/test';

test.describe('Comparison', () => {
  test('compare page loads with instructions', async ({ page }) => {
    await page.goto('/compare');
    await expect(page.locator('h1')).toContainText('Compare');
    await expect(page.getByRole('heading', { name: 'Select two photos' })).toBeVisible();
  });

  test.fixme('comparison modes can be selected', async ({ page }) => {
    // Requires photos to be loaded into comparison store
    await page.goto('/compare');
  });
});

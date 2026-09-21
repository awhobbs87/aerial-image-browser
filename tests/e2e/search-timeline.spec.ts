import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
const photo = {
  objectId: 1,
  layerId: 0,
  name: '1439_183',
  year: 1956,
  scale: 12000,
  layerName: 'Hobart',
  type: 'Colour',
  rings: [
    [
      [147.27, -42.88],
      [147.29, -42.88],
      [147.29, -42.86],
      [147.27, -42.88],
    ],
  ],
};
test.beforeEach(async ({ page }) => {
  await page.route('**/api/search/location?**', (route) =>
    route.fulfill({ json: { success: true, data: { count: 1, photos: [photo] } } }),
  );
  await page.route('**/api/geocoding/search?**', (route) =>
    route.fulfill({
      json: [
        {
          placeId: 'list-7-1',
          displayName: '9 JEANNETTE COURT LENAH VALLEY, Tasmania',
          lat: -42.87,
          lon: 147.28,
          type: 'address',
          importance: 1,
          boundingBox: [-42.87, -42.87, 147.28, 147.28],
        },
      ],
    }),
  );
  await page.route('**/api/images/thumbnail/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="gray"/></svg>',
    }),
  );
  await page.route('**/api/images/metadata/**', (route) => route.fulfill({ json: photo }));
  await page.route('**/api/images/tiff-proxy/**', (route) => route.fulfill({ status: 404 }));
});

test('keeps the location command palette inside the mobile viewport', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('mobile'), 'Mobile viewport regression');

  await page.goto('/search');
  await page.getByRole('button', { name: 'Search for a location' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  const viewport = page.viewportSize();

  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);

  await page.evaluate(() =>
    document.documentElement.style.setProperty('--search-keyboard-inset', '300px'),
  );
  const keyboardBox = await dialog.boundingBox();
  expect(keyboardBox).not.toBeNull();
  expect(keyboardBox!.y + keyboardBox!.height).toBeLessThanOrEqual(viewport!.height - 300 + 1);
});

test('address search persists recents and populates timeline after navigation and reload', async ({
  page,
}, info) => {
  await page.goto('/search');
  await page.getByRole('button', { name: 'Search for a location' }).click();
  await page
    .getByRole('combobox', { name: 'Search Tasmania locations' })
    .fill('9 Jeannette Ct Lenah Valley');
  await page.getByText('9 JEANNETTE COURT LENAH VALLEY', { exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await page.getByRole('button', { name: 'Search for a location' }).click();
  await expect(page.getByRole('option', { name: /Recent search/ })).toBeVisible();
  await page.getByRole('button', { name: 'Close search' }).click();
  await page.getByRole('link', { name: 'Timeline', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('heading', { name: '1956', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '1956', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '1439_183' }).click();
  await page.getByRole('button', { name: 'Open full viewer' }).click();
  await expect(page).toHaveURL(/lat=-42.87/);
  await page.getByRole('button', { name: 'Location reference' }).click();
  await expect(page.getByText(/cannot place an accurate address pin/)).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('9 JEANNETTE COURT LENAH VALLEY');
  await expect(page.getByRole('status').filter({ hasText: 'Survey footprint shown' })).toHaveText(
    'Survey footprint shown',
  );
  await page.screenshot({ path: info.outputPath('reference.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('clears recents and displays search errors without stale selectable results', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'tas-aerial-recent-searches',
      JSON.stringify([{ label: 'Lenah Valley', lat: -42.87, lon: 147.28 }]),
    ),
  );
  await page.goto('/search');
  await page.getByRole('button', { name: 'Search for a location' }).click();
  await page.getByRole('button', { name: 'Clear recent searches' }).click();
  await expect(page.getByRole('option', { name: /Recent search/ })).toHaveCount(0);
  await page.route('**/api/geocoding/search?**', (route) => route.fulfill({ status: 502 }));
  await page.getByRole('combobox', { name: 'Search Tasmania locations' }).fill('Jeannette Ct');
  await expect(page.getByText(/temporarily unavailable/)).toBeVisible();
});

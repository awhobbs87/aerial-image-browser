import { test, expect } from '@playwright/test';
test.use({ serviceWorkers: 'block' });
const photos = [1, 2].map((id) => ({
  objectId: id,
  layerId: 0,
  name: `audit_${id}`,
  year: 1980 + id * 20,
  dateFlown: Date.UTC(1980 + id * 20, 0, 1),
  scale: 12000,
  layerName: `Survey ${id}`,
  type: 'Black & White',
  run: '1',
  filmType: '1234',
  photoNo: String(id),
  tiffUrl: '',
  rings: [
    [
      [147.3, -42.9],
      [147.4, -42.9],
      [147.4, -42.8],
      [147.3, -42.9],
    ],
  ],
}));
test.beforeEach(async ({ page }) => {
  await page.route('**/api/search/location?**', (route) =>
    route.fulfill({
      json: { success: true, data: { count: 2, photos, failedLayers: [], complete: true } },
    }),
  );
  await page.route('**/api/search/bounds?**', (route) =>
    route.fulfill({
      json: { success: true, data: { count: 2, photos, failedLayers: [], complete: true } },
    }),
  );
  await page.route('**/api/images/thumbnail/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="gray"/></svg>',
    }),
  );
  await page.route('**/api/images/tiff-proxy/**', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/images/metadata/**', (route) => route.fulfill({ json: photos[0] }));
});
test('opens details and compares two selected photos across navigation and reload', async ({
  page,
}) => {
  await page.goto('/search?lat=-42.88&lon=147.32&q=Hobart');
  await expect(page.getByText('Showing 2 of 2 photos')).toBeVisible();
  await page.getByRole('article').first().click();
  await page.getByRole('button', { name: 'Details', exact: true }).click();
  await expect(page.getByText('Film number', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Add to compare' }).click();
  await page.getByRole('button', { name: 'Close preview' }).click();
  await page.getByRole('article').nth(1).click();
  await page.getByRole('button', { name: 'Add to compare' }).click();
  await page.getByRole('link', { name: 'View comparison' }).click();
  await expect(page.getByRole('slider', { name: 'Comparison slider' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('slider', { name: 'Comparison slider' })).toBeVisible();
});
test('retries failed layers without dropping successful photos', async ({ page }) => {
  await page.route('**/api/search/location?**', (route) => {
    const retry = new URL(route.request().url()).searchParams.get('layers') === '1';
    return route.fulfill({
      json: {
        success: true,
        data: retry
          ? { photos: [], count: 0, complete: true, failedLayers: [] }
          : { photos, count: 2, complete: false, failedLayers: [1] },
      },
    });
  });
  await page.goto('/search?lat=-42.88&lon=147.32&q=Hobart');
  await page.getByRole('button', { name: 'Retry unavailable layers' }).click();
  await expect(page.getByText('Showing 2 of 2 photos')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry unavailable layers' })).toHaveCount(0);
});
test('restores area search from a shared URL', async ({ page }) => {
  const bounds = encodeURIComponent(
    JSON.stringify({ west: 147.3, east: 147.4, south: -42.9, north: -42.8 }),
  );
  await page.goto(`/search?lat=-42.85&lon=147.35&bounds=${bounds}`);
  await expect(page.getByText('Photos overlapping the outlined map area')).toBeVisible();
  await expect(page.getByText('Showing 2 of 2 photos')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Photos overlapping the outlined map area')).toBeVisible();
});

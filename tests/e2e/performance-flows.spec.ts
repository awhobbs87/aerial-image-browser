import { test, expect } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

const photos = Array.from({ length: 60 }, (_, i) => ({
  objectId: i + 1,
  layerId: 0,
  name: `TEST_${i + 1}`,
  type: 'Colour',
  run: '1',
  dateFlown: Date.UTC(2000 + (i % 20), 0, 1),
  year: 2000 + (i % 20),
  scale: i % 2 ? 5000 : 20000,
  filmType: 'Colour',
  altitude: 0,
  photoNo: String(i),
  layerName: 'Test survey',
  area: 0,
  thumbnailUrl: 'https://unused.example/thumbnail.jpg',
  imageUrl: '',
  tiffUrl: '',
  rings: [],
}));
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="640" height="480" fill="#666"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/search/location?**', (route) =>
    route.fulfill({ json: { success: true, data: { count: photos.length, photos } } }),
  );
  await page.route('**/api/images/thumbnail/**', (route) =>
    route.fulfill({ contentType: 'image/svg+xml', body: svg }),
  );
  await page.route('**/api/images/tiff-proxy/**', (route) => route.fulfill({ status: 404 }));
  await page.route('**/api/version', (route) =>
    route.fulfill({ json: { displayVersion: 'test', workerVersion: {} } }),
  );
});

test('filters cached photos without another search and restores loaded cards on return', async ({
  page,
}, testInfo) => {
  let searches = 0;
  page.on('request', (request) => {
    if (request.url().includes('/api/search/location?')) searches++;
  });
  await page.goto('/search?lat=-42.8821&lon=147.3272&q=Hobart');
  await expect(page.getByRole('article')).toHaveCount(24);
  await page.evaluate(() => {
    (window as any).__navigationSentinel = 'same-document';
  });
  const mobile = testInfo.project.name === 'mobile';
  if (mobile) await page.getByRole('button', { name: 'Show filters', exact: true }).click();
  await page.getByRole('button', { name: 'Very detailed (≤ 1:5,000)', exact: true }).last().click();
  if (mobile) await page.getByRole('button', { name: /close/i }).last().click();
  await expect(page.getByText('30 photos', { exact: true })).toBeVisible();
  expect(searches).toBe(1);
  await page.getByRole('button', { name: 'Load more photos' }).click();
  await expect(page.getByRole('article')).toHaveCount(30);
  const panel = page.locator('[data-search-results-scroll]');
  await panel.evaluate((el) => {
    el.scrollTop = 450;
  });
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(400);
  await page
    .getByRole('link', { name: 'Favorites', exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL(/favorites/);
  await page.getByRole('link', { name: 'Map', exact: true }).filter({ visible: true }).click();
  await expect(page.getByRole('article')).toHaveCount(30);
  await expect.poll(() => panel.evaluate((el) => el.scrollTop)).toBeGreaterThan(400);
  expect(searches).toBe(1);
  expect(await page.evaluate(() => (window as any).__navigationSentinel)).toBe('same-document');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: testInfo.outputPath('search-restored.png') });
});

test('photo preview and full viewer use cached variants and client navigation', async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto('/search?lat=-42.8821&lon=147.3272&q=Hobart');
  await expect(page.getByRole('article')).toHaveCount(24);
  await page.evaluate(() => {
    (window as any).__navigationSentinel = 'same-document';
  });
  await page.getByRole('article').first().click();
  const preview = page.getByRole('dialog').locator('img');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('src', /variant=preview-1600/);
  await page.getByRole('button', { name: 'Open full viewer' }).click();
  expect(pageErrors).toEqual([]);
  await expect(page).toHaveURL(/\/viewer\/0\/TEST_/, { timeout: 15_000 });
  await expect(page.locator('.openseadragon-container').first()).toBeVisible();
  expect(await page.evaluate(() => (window as any).__navigationSentinel)).toBe('same-document');
  await page.getByRole('button', { name: 'Back to results' }).click();
  await expect(page.getByRole('article')).toHaveCount(24);
});

test('search controls remain usable when map code is delayed', async ({ page }) => {
  await page.route(
    /\/(?:src\/components\/map\/MapView\.tsx|_astro\/MapView\.[^/]+\.js)/,
    async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      await route.continue();
    },
  );
  await page.goto('/search?lat=-42.8821&lon=147.3272&q=Hobart', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Search for a location' })).toBeVisible();
  await page.getByRole('button', { name: 'Search for a location' }).click();
  await expect(page.getByRole('combobox', { name: 'Search Tasmania locations' })).toBeVisible();
});

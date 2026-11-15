import { collectSearchLayers } from '@/lib/search-response';
import { enhancePhoto } from '@/lib/search-helpers';
import { photoDateOrder, photoDateLabel } from '@/lib/photo-metadata';
import { filterPhotos } from '@/lib/photo-filters';
import { searchableBounds, geocodingBounds } from '@/lib/search-extent';
import { AIService } from '@/lib/ai';

const photo = (attributes: Record<string, unknown> = {}) =>
  enhancePhoto({ attributes: { OBJECTID: 1, IMAGE_NAME: 'test.tif', ...attributes } }, 0);
it('keeps successful layers and marks incomplete counts', async () => {
  const result = await collectSearchLayers([0, 1, 2], async (layer) => {
    if (layer === 1) throw new Error('offline');
    return [{ attributes: { OBJECTID: layer + 1, IMAGE_NAME: 'test' } }];
  });
  expect(result.count).toBe(2);
  expect(result.complete).toBe(false);
  expect(result.failedLayers).toEqual([1]);
  await expect(
    collectSearchLayers([0], async () => {
      throw new Error('offline');
    }),
  ).rejects.toThrow('temporarily unavailable');
});
it('distinguishes capture dates, inferred years, and unknown dates', () => {
  const inferred = photo({ PROJ_NAME: 'Hobart 82' });
  const captured = photo({ FLY_DATE: 0, CAPTURE_START_DATE: Date.UTC(2026, 2, 10) });
  expect(inferred.dateSource).toBe('survey');
  expect(photoDateLabel(inferred)).toContain('inferred');
  expect(captured.dateSource).toBe('capture');
  expect(captured.year).toBe(2026);
  expect(photo().dateSource).toBe('unknown');
  expect(
    [photo(), inferred, captured].sort((a, b) => photoDateOrder(a, b, 'desc')).map((p) => p.year),
  ).toEqual([2026, 1982, 0]);
  expect(
    [photo(), inferred, captured].sort((a, b) => photoDateOrder(a, b, 'asc')).map((p) => p.year),
  ).toEqual([1982, 2026, 0]);
});
it('can exclude unknown values and filter the current survey', () => {
  const filters = { layers: [0, 1, 2], startYear: null, endYear: null, scaleCategories: [] };
  const photos = [photo(), photo({ PROJ_NAME: 'Hobart 82', SCALE: 5000 })];
  expect(filterPhotos(photos, filters)).toHaveLength(2);
  expect(filterPhotos(photos, { ...filters, includeUnknownDates: false })).toHaveLength(1);
  expect(filterPhotos(photos, { ...filters, includeUnknownScales: false })).toHaveLength(1);
  expect(filterPhotos(photos, { ...filters, survey: 'Other' })).toEqual([]);
});
it('rejects broad, invalid and point-only area bounds', () => {
  expect(searchableBounds({ west: 147, east: 147.1, south: -43, north: -42.9 })).toBe(true);
  expect(searchableBounds({ west: 146, east: 148, south: -43, north: -42 })).toBe(false);
  expect(searchableBounds({ west: NaN, east: 147, south: -43, north: -42 })).toBe(false);
  expect(geocodingBounds([-42, -42, 147, 147])).toBeNull();
});
it('accepts the current year in AI output and identifies fallback parsing', async () => {
  const year = new Date().getUTCFullYear();
  const ai = new AIService({
    run: async () => ({
      response: JSON.stringify({ location: 'Hobart', startYear: year, endYear: year }),
    }),
  } as unknown as Ai);
  expect(await ai.parseNaturalLanguageSearch(`Hobart in ${year}`)).toMatchObject({
    startYear: year,
    endYear: year,
    parser: 'ai',
  });
  const fallback = new AIService({ run: async () => ({ response: '{}' }) } as unknown as Ai);
  // Invalid JSON invokes the heuristic path without inventing model confidence.
  const unavailable = new AIService({
    run: async () => ({ response: 'unavailable' }),
  } as unknown as Ai);
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  expect(await unavailable.parseNaturalLanguageSearch('Hobart in the 1980s')).toMatchObject({
    parser: 'fallback',
    startYear: 1980,
    endYear: 1989,
  });
  expect((await fallback.parseNaturalLanguageSearch('Hobart')).location).toBe('Hobart');
  spy.mockRestore();
});

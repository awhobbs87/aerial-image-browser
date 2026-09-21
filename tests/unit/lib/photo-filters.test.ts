import { filterPhotos } from '@/lib/photo-filters';
import type { EnhancedPhoto } from '@/types/photo';
const photos = [
  { objectId: 1, layerId: 0, year: 1980, scale: 5000 },
  { objectId: 2, layerId: 0, year: 2000, scale: 20000 },
  { objectId: 3, layerId: 2, year: 2020, scale: 50000 },
  { objectId: 4, layerId: 0, year: 0, scale: 0 },
] as EnhancedPhoto[];
const defaults = { layers: [0, 1, 2], startYear: null, endYear: null, scaleCategories: [] };
it('includes end-year captures and preserves undated records', () => {
  expect(
    filterPhotos(photos, { ...defaults, startYear: 1980, endYear: 2000 }).map((p) => p.objectId),
  ).toEqual([1, 2, 4]);
});
it('matches disjoint selected scale bands, rather than their enclosing range', () => {
  expect(
    filterPhotos(photos, { ...defaults, scaleCategories: ['very-detailed', 'overview'] }).map(
      (p) => p.objectId,
    ),
  ).toEqual([1, 3, 4]);
});
it('returns no results when all layers are disabled', () => {
  expect(filterPhotos(photos, { ...defaults, layers: [] })).toEqual([]);
});

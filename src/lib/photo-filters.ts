import { SCALE_CATEGORIES, type EnhancedPhoto, type ScaleCategory } from '@/types/photo';

export interface PhotoFilters {
  layers: number[];
  startYear: number | null;
  endYear: number | null;
  scaleCategories: ScaleCategory[];
}

export function filterPhotos(photos: EnhancedPhoto[], filters: PhotoFilters): EnhancedPhoto[] {
  const scales = SCALE_CATEGORIES.filter((category) =>
    filters.scaleCategories.includes(category.key),
  );
  return photos.filter((photo) => {
    if (!filters.layers.includes(photo.layerId)) return false;
    // Preserve undated/unknown-scale records, as the API has always done.
    if (photo.year > 0 && filters.startYear !== null && photo.year < filters.startYear)
      return false;
    if (photo.year > 0 && filters.endYear !== null && photo.year > filters.endYear) return false;
    return (
      !photo.scale ||
      !scales.length ||
      scales.some((c) => photo.scale >= c.minScale && photo.scale <= c.maxScale)
    );
  });
}

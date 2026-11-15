import type { ArcGISFeature } from './arcgis';
import { enhancePhoto, sortByDateDesc } from './search-helpers';
import type { SearchData } from '@/types/api';

export async function collectSearchLayers(
  layers: number[],
  query: (layer: number) => Promise<ArcGISFeature[]>,
): Promise<SearchData> {
  const results = await Promise.allSettled(layers.map(query));
  const failedLayers = layers.filter((_, index) => results[index].status === 'rejected');
  if (failedLayers.length === layers.length)
    throw new Error('Imagery search is temporarily unavailable. Please try again.');
  const photos = sortByDateDesc(
    results.flatMap((result, index) =>
      result.status === 'fulfilled'
        ? result.value.map((feature) => enhancePhoto(feature, layers[index]))
        : [],
    ),
  );
  return {
    photos,
    count: photos.length,
    complete: failedLayers.length === 0,
    failedLayers,
    checkedAt: Date.now(),
  };
}

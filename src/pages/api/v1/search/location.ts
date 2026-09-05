import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ArcGISClient } from '@/lib/arcgis';
import {
  applyFilters,
  enhancePhoto,
  parseFilterParams,
  sortByDateDesc,
} from '@/lib/search-helpers';
import {
  mapNativePhoto,
  getNativeApiPrefix,
  nativeError,
  nativeSuccess,
  parseNativeLayerIds,
  type NativeSearchResponse,
} from '@/lib/native-api';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng') ?? url.searchParams.get('lon'));

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return nativeError('INVALID_COORDINATES', 'Provide numeric lat and lng query parameters.', 400);
  }

  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return nativeError(
      'COORDINATES_OUT_OF_RANGE',
      'lat must be -90..90 and lng must be -180..180.',
      400,
    );
  }

  const layers = parseNativeLayerIds(url);
  const filters = parseFilterParams(url);
  const origin = url.origin;
  const apiPrefix = getNativeApiPrefix(url);

  try {
    const client = new ArcGISClient(env.API_BASE_URL);
    const results = await Promise.all(
      layers.map(async (layerId) => {
        const features = await client.queryByPoint(layerId, lng, lat);
        return features.map((feature) => enhancePhoto(feature, layerId));
      }),
    );

    const photos = sortByDateDesc(applyFilters(results.flat(), filters));
    const response: NativeSearchResponse = {
      count: photos.length,
      photos: photos.map((photo) => mapNativePhoto(photo, origin, apiPrefix)),
    };

    return nativeSuccess(response);
  } catch (error) {
    console.error('Native search by location error:', error);
    const message = error instanceof Error ? error.message : 'Search failed';
    return nativeError('SEARCH_FAILED', message, 500);
  }
};

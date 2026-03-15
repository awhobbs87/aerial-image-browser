/**
 * Search by geographic point (lat/lon).
 *
 * GET /api/search/location?lat=...&lon=...&layers=0,1,2&startDate=...&endDate=...&minScale=...&maxScale=...&imageTypes=...
 *
 * Queries each requested ArcGIS layer for features intersecting the point,
 * enhances them with display fields, applies filters, and returns sorted results.
 */

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ArcGISClient } from '@/lib/arcgis';
import {
  enhancePhoto,
  applyFilters,
  parseFilterParams,
  parseLayerIds,
  sortByDateDesc,
  jsonError,
  jsonSuccess,
} from '@/lib/search-helpers';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);

  // Parse and validate coordinates
  const lat = parseFloat(url.searchParams.get('lat') || '');
  const lon = parseFloat(url.searchParams.get('lon') || '');

  if (isNaN(lat) || isNaN(lon)) {
    return jsonError('Invalid coordinates. Provide numeric lat and lon query parameters.', 400);
  }

  // Validate coordinate ranges (Tasmania roughly: lat -39 to -44, lon 144 to 149)
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return jsonError('Coordinates out of range. lat: -90..90, lon: -180..180.', 400);
  }

  const layers = parseLayerIds(url);
  const filters = parseFilterParams(url);

  try {
    const client = new ArcGISClient(env.API_BASE_URL);

    // Query all requested layers in parallel
    const results = await Promise.all(
      layers.map(async (layerId) => {
        const features = await client.queryByPoint(layerId, lon, lat);
        return features.map((f) => enhancePhoto(f, layerId));
      }),
    );

    // Flatten, filter, and sort
    let photos = results.flat();
    photos = applyFilters(photos, filters);
    photos = sortByDateDesc(photos);

    return jsonSuccess({ count: photos.length, photos });
  } catch (error) {
    console.error('Search by location error:', error);
    const message = error instanceof Error ? error.message : 'Search failed';
    return jsonError(message, 500);
  }
};

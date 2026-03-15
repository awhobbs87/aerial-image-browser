/**
 * Search by geographic bounding box.
 *
 * GET /api/search/bounds?west=...&south=...&east=...&north=...&layers=0,1,2&startDate=...&endDate=...&minScale=...&maxScale=...&imageTypes=...
 *
 * Queries each requested ArcGIS layer for features intersecting the envelope,
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

  // Parse and validate bounds
  const west = parseFloat(url.searchParams.get('west') || '');
  const south = parseFloat(url.searchParams.get('south') || '');
  const east = parseFloat(url.searchParams.get('east') || '');
  const north = parseFloat(url.searchParams.get('north') || '');

  if (isNaN(west) || isNaN(south) || isNaN(east) || isNaN(north)) {
    return jsonError('Invalid bounds. Provide numeric west, south, east, and north query parameters.', 400);
  }

  // Validate geographic ranges
  if (west < -180 || east > 180 || south < -90 || north > 90) {
    return jsonError('Bounds out of range. lon: -180..180, lat: -90..90.', 400);
  }

  if (west >= east) {
    return jsonError('west must be less than east.', 400);
  }

  if (south >= north) {
    return jsonError('south must be less than north.', 400);
  }

  const layers = parseLayerIds(url);
  const filters = parseFilterParams(url);

  try {
    const client = new ArcGISClient(env.API_BASE_URL);

    // Query all requested layers in parallel
    const results = await Promise.all(
      layers.map(async (layerId) => {
        const features = await client.queryByBounds(layerId, west, south, east, north);
        return features.map((f) => enhancePhoto(f, layerId));
      }),
    );

    // Flatten, filter, and sort
    let photos = results.flat();
    photos = applyFilters(photos, filters);
    photos = sortByDateDesc(photos);

    return jsonSuccess({ count: photos.length, photos });
  } catch (error) {
    console.error('Search by bounds error:', error);
    const message = error instanceof Error ? error.message : 'Search failed';
    return jsonError(message, 500);
  }
};

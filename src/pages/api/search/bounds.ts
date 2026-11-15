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
import { collectSearchLayers } from '@/lib/search-response';
import { ArcGISClient } from '@/lib/arcgis';
import {
  applyFilters,
  parseFilterParams,
  parseLayerIds,
  jsonError,
  jsonSuccess,
} from '@/lib/search-helpers';

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);

  // Parse and validate bounds
  const west = parseFloat(url.searchParams.get('west') || '');
  const south = parseFloat(url.searchParams.get('south') || '');
  const east = parseFloat(url.searchParams.get('east') || '');
  const north = parseFloat(url.searchParams.get('north') || '');

  if (![west, south, east, north].every(Number.isFinite)) {
    return jsonError(
      'Invalid bounds. Provide numeric west, south, east, and north query parameters.',
      400,
    );
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

  if (east - west > 0.2 || north - south > 0.2)
    return jsonError('Zoom in to search an area smaller than roughly 20 km across.', 400);

  const layers = parseLayerIds(url);
  const filters = parseFilterParams(url);
  if (!layers.length || layers.some((id) => ![0, 1, 2].includes(id)))
    return jsonError('Choose a valid imagery layer.', 400);

  try {
    const client = new ArcGISClient(env.API_BASE_URL, {
      kv: env.PHOTO_CACHE,
      primeMediaSources: true,
      refresh: url.searchParams.get('refresh') === 'true',
      signal: request.signal,
      defer: locals.cfContext ? (task) => locals.cfContext.waitUntil(task) : undefined,
    });

    const result = await collectSearchLayers(layers, (layerId) =>
      client.queryByBounds(layerId, west, south, east, north),
    );
    const photos = applyFilters(result.photos, filters);
    return jsonSuccess({ ...result, count: photos.length, photos });
  } catch (error) {
    console.error('Search by bounds error:', error);
    const message = error instanceof Error ? error.message : 'Search failed';
    return jsonError(message, 500);
  }
};

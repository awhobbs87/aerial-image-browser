/**
 * Shared helpers for search API routes.
 * Converts raw ArcGIS features to enhanced photos and applies filters.
 */

import type { ArcGISFeature } from '@/lib/arcgis';
import { formatDate, getLayerType } from '@/lib/format';

/**
 * Enhanced photo as returned by search endpoints.
 *
 * Extends the raw ArcGIS attributes (UPPER_CASE field names) with computed
 * display fields and layer metadata. Uses the same shape as the original
 * Hono API to maintain frontend compatibility.
 */
export interface SearchPhoto {
  /** All raw ArcGIS attributes (OBJECTID, IMAGE_NAME, FLY_DATE, SCALE, etc.) */
  [key: string]: unknown;
  layerId: number;
  layerType: 'aerial' | 'ortho' | 'digital';
  dateFormatted: string | null;
  scaleFormatted: string | null;
  cached: boolean;
  thumbnailCached: boolean;
  geometry?: {
    rings?: number[][][];
  };
}

/** Filter parameters parsed from query string */
export interface SearchFilters {
  startDate?: string;
  endDate?: string;
  minScale?: number;
  maxScale?: number;
  imageTypes?: string[];
}

/**
 * Convert a raw ArcGIS feature into an enhanced photo object.
 * Spreads the raw attributes, adds computed display fields and layer metadata.
 */
export function enhancePhoto(feature: ArcGISFeature, layerId: number): SearchPhoto {
  const attrs = feature.attributes as Record<string, unknown>;
  const layerType = getLayerType(layerId);
  const flyDate = (attrs.FLY_DATE ?? attrs.CAPTURE_START_DATE) as number | undefined;

  return {
    ...attrs,
    geometry: feature.geometry,
    layerId,
    layerType,
    dateFormatted: formatDate(flyDate),
    scaleFormatted: attrs.SCALE ? `1:${(attrs.SCALE as number).toLocaleString()}` : null,
    cached: false,
    thumbnailCached: false,
  };
}

/**
 * Apply date, scale, and image type filters to an array of enhanced photos.
 * Matches the filtering logic from the original Hono routes.
 */
export function applyFilters(photos: SearchPhoto[], filters: SearchFilters): SearchPhoto[] {
  return photos.filter((photo) => {
    const flyDate = photo.FLY_DATE as number | undefined;
    const scale = photo.SCALE as number | undefined;

    // Date filtering
    if (filters.startDate && flyDate) {
      const startTime = new Date(filters.startDate).getTime();
      if (flyDate < startTime) return false;
    }
    if (filters.endDate && flyDate) {
      const endTime = new Date(filters.endDate).getTime();
      if (flyDate > endTime) return false;
    }

    // Scale filtering
    if (filters.minScale && scale && scale < filters.minScale) {
      return false;
    }
    if (filters.maxScale && scale && scale > filters.maxScale) {
      return false;
    }

    // Image type filtering (aerial, ortho, digital)
    if (filters.imageTypes && filters.imageTypes.length > 0) {
      if (!filters.imageTypes.includes(photo.layerType)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Parse common filter query parameters from a URL.
 */
export function parseFilterParams(url: URL): SearchFilters {
  const startDate = url.searchParams.get('startDate') ?? undefined;
  const endDate = url.searchParams.get('endDate') ?? undefined;
  const minScaleRaw = url.searchParams.get('minScale');
  const maxScaleRaw = url.searchParams.get('maxScale');
  const imageTypesRaw = url.searchParams.get('imageTypes');

  return {
    startDate,
    endDate,
    minScale: minScaleRaw ? parseFloat(minScaleRaw) : undefined,
    maxScale: maxScaleRaw ? parseFloat(maxScaleRaw) : undefined,
    imageTypes: imageTypesRaw ? imageTypesRaw.split(',') : undefined,
  };
}

/**
 * Parse comma-separated layer IDs from query string.
 * Defaults to all three layers: [0, 1, 2].
 */
export function parseLayerIds(url: URL): number[] {
  const raw = url.searchParams.get('layers');
  if (!raw) return [0, 1, 2];
  return raw.split(',').map(Number).filter((n) => !isNaN(n));
}

/**
 * Sort photos by FLY_DATE descending (newest first).
 * Photos without a date are sorted to the end.
 */
export function sortByDateDesc(photos: SearchPhoto[]): SearchPhoto[] {
  return photos.sort((a, b) => {
    const aDate = (a.FLY_DATE as number) || 0;
    const bDate = (b.FLY_DATE as number) || 0;
    return bDate - aDate;
  });
}

/** Create a JSON error response */
export function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

/** Create a JSON success response */
export function jsonSuccess(data: unknown): Response {
  return new Response(
    JSON.stringify({ success: true, data }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

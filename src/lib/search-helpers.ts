/**
 * Shared helpers for search API routes.
 * Converts raw ArcGIS features to enhanced photos and applies filters.
 */

import type { ArcGISFeature } from '@/lib/arcgis';
import { getLayerType } from '@/lib/format';
import type { EnhancedPhoto } from '@/types/photo';

/** Filter parameters parsed from query string */
export interface SearchFilters {
  startDate?: string;
  endDate?: string;
  minScale?: number;
  maxScale?: number;
  imageTypes?: string[];
}

/**
 * Attempt to extract a year from a project/layer name string.
 * Handles patterns like "Hobart 82", "HUON 1974", "COASTAL 2001", "NW 63-64".
 * Returns 0 if no credible year can be found.
 *
 * Rules:
 * - 4-digit year (1900–2099): use directly
 * - 2-digit year (00–99): interpret as 1900+xx for xx >= 46 (earliest aerial surveys),
 *   2000+xx for xx <= 25 (current decade cut-off), else 1900+xx
 * - Ambiguous range suffixes like "63-64" → take the first number
 */
export function extractYearFromLayerName(layerName: string): number {
  if (!layerName) return 0;

  // Try 4-digit year first (most unambiguous)
  const fourDigit = layerName.match(/\b(19\d{2}|20[012]\d)\b/);
  if (fourDigit) return parseInt(fourDigit[1], 10);

  // Try 2-digit year — must appear as a standalone token (not part of a larger number)
  // e.g. "Hobart 82", "NW 63-64", "MIDLANDS 46"
  const twoDigit = layerName.match(/\b(\d{2})(?:-\d{2})?\b/);
  if (twoDigit) {
    const n = parseInt(twoDigit[1], 10);
    // Aerial surveys in Tasmania started in 1946; treat 46–99 as 1900s, 00–25 as 2000s
    if (n >= 46 && n <= 99) return 1900 + n;
    if (n >= 0 && n <= 25) return 2000 + n;
  }

  return 0;
}

/**
 * Convert a raw ArcGIS feature into an EnhancedPhoto.
 * Maps ArcGIS UPPER_CASE fields to the camelCase EnhancedPhoto interface
 * that the frontend expects.
 */
export function enhancePhoto(feature: ArcGISFeature, layerId: number): EnhancedPhoto {
  const a = feature.attributes;
  const flyDate = (a.FLY_DATE ?? a.CAPTURE_START_DATE ?? 0) as number;
  const layerName = (a.PROJ_NAME ?? '') as string;

  // Primary: derive year from fly date timestamp.
  // Fallback: parse the project/layer name for an embedded year (e.g. "Hobart 82" → 1982).
  let year = flyDate > 0 ? new Date(flyDate).getFullYear() : 0;
  if (year === 0) {
    year = extractYearFromLayerName(layerName);
  }

  const imageName = ((a.IMAGE_NAME ?? '') as string).replace(/\.tif$/i, '');

  return {
    objectId: a.OBJECTID as number,
    layerId,
    name: imageName,
    type: (a.IMAGE_TYPE ?? '') as string,
    run: (a.RUN_NO ?? '') as string,
    dateFlown: flyDate,
    year,
    scale: (a.SCALE ?? 0) as number,
    filmType: (a.FILM_NO ?? '') as string,
    altitude: (a.HEIGHT ?? 0) as number,
    photoNo: (a.FRAME ?? '') as string,
    layerName,
    area: (a['SHAPE.AREA'] ?? a.Shape__Area ?? 0) as number,
    thumbnailUrl: (a.THUMBNAIL_LINK ?? '') as string,
    imageUrl: `/api/images/webp/${layerId}/${imageName}`,
    tiffUrl: (a.DOWNLOAD_LINK ?? '') as string,
    rings: feature.geometry?.rings ?? [],
  };
}

/**
 * Apply date, scale, and image type filters to an array of enhanced photos.
 */
export function applyFilters(photos: EnhancedPhoto[], filters: SearchFilters): EnhancedPhoto[] {
  return photos.filter((photo) => {
    // Date filtering
    if (filters.startDate && photo.dateFlown) {
      const startTime = new Date(filters.startDate).getTime();
      if (photo.dateFlown < startTime) return false;
    }
    if (filters.endDate && photo.dateFlown) {
      const endTime = new Date(filters.endDate).getTime();
      if (photo.dateFlown > endTime) return false;
    }

    // Scale filtering
    if (filters.minScale && photo.scale && photo.scale < filters.minScale) {
      return false;
    }
    if (filters.maxScale && photo.scale && photo.scale > filters.maxScale) {
      return false;
    }

    // Image type filtering (aerial, ortho, digital)
    if (filters.imageTypes && filters.imageTypes.length > 0) {
      const layerType = getLayerType(photo.layerId);
      if (!filters.imageTypes.includes(layerType)) {
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
  return raw
    .split(',')
    .map(Number)
    .filter((n) => !isNaN(n));
}

/**
 * Sort photos by dateFlown descending (newest first).
 * Photos without a date are sorted to the end.
 */
export function sortByDateDesc(photos: EnhancedPhoto[]): EnhancedPhoto[] {
  return photos.sort((a, b) => {
    const aDate = a.dateFlown || 0;
    const bDate = b.dateFlown || 0;
    return bDate - aDate;
  });
}

/** Create a JSON error response */
export function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Create a JSON success response */
export function jsonSuccess(data: unknown): Response {
  return new Response(JSON.stringify({ success: true, data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

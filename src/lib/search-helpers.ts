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
 * Convert a raw ArcGIS feature into an EnhancedPhoto.
 * Maps ArcGIS UPPER_CASE fields to the camelCase EnhancedPhoto interface
 * that the frontend expects.
 */
export function enhancePhoto(feature: ArcGISFeature, layerId: number): EnhancedPhoto {
  const a = feature.attributes;
  const flyDate = (a.FLY_DATE ?? a.CAPTURE_START_DATE ?? 0) as number;
  const year = flyDate > 0 ? new Date(flyDate).getFullYear() : 0;
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
    layerName: (a.PROJ_NAME ?? '') as string,
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

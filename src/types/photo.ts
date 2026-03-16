/**
 * Core photo types shared between API and frontend.
 * Ported from the original src/types/bindings.ts.
 */

/**
 * Raw attributes from the ArcGIS REST API feature response.
 * Field names match what the service actually returns (UPPER_CASE).
 * These are the fields read by enhancePhoto() in search-helpers.ts.
 */
export interface PhotoAttributes {
  OBJECTID: number;
  IMAGE_NAME: string;
  IMAGE_TYPE: string;
  RUN_NO: string;
  /** Unix timestamp ms. May be 0/null — fall back to layerName year extraction. */
  FLY_DATE: number;
  /** Present on orthophoto/digital layers; fallback when FLY_DATE is absent. */
  CAPTURE_START_DATE?: number;
  SCALE: number;
  FILM_NO: string;
  HEIGHT: number;
  FRAME: string;
  /** Project/survey name, e.g. "Hobart 82", "HUON - DERWENT 1982 COASTAL" */
  PROJ_NAME: string;
  'SHAPE.AREA'?: number;
  Shape__Area?: number;
  THUMBNAIL_LINK: string;
  DOWNLOAD_LINK: string;
}

/** Photo with computed display properties */
export interface EnhancedPhoto {
  objectId: number;
  layerId: number;
  name: string;
  type: string;
  run: string;
  dateFlown: number;
  year: number;
  scale: number;
  filmType: string;
  altitude: number;
  photoNo: string;
  layerName: string;
  area: number;
  thumbnailUrl: string;
  imageUrl: string;
  tiffUrl: string;
  rings: number[][][];
}

/** ArcGIS layer metadata */
export interface LayerInfo {
  id: number;
  name: string;
  description: string;
  minScale: number;
  maxScale: number;
  geometryType: string;
  featureCount: number;
}

/** Search result envelope */
export interface SearchResult {
  photos: EnhancedPhoto[];
  total: number;
  hasMore: boolean;
  layers: number[];
  center: { lat: number; lon: number };
  radius: number;
}

/** Scale category for filtering — matches the original app's 4-tier system */
export type ScaleCategory =
  | 'very-detailed' // ≤ 1:5,000  (largest / most detailed)
  | 'detailed' // 1:5,001 – 1:15,000
  | 'standard' // 1:15,001 – 1:40,000
  | 'overview'; // > 1:40,000 (smallest / least detailed)

/** Scale category definition */
export interface ScaleCategoryDef {
  key: ScaleCategory;
  label: string;
  /** Inclusive lower bound (0 = no lower bound) */
  minScale: number;
  /** Inclusive upper bound (Infinity = no upper bound) */
  maxScale: number;
}

/**
 * Predefined scale categories.
 * Mirrors the original filterPanelConfig.ts SCALE_CATEGORIES.
 * Note: "scale" here means the denominator of the representative fraction
 * (e.g. 5000 = 1:5,000). Smaller denominator = larger / more detailed image.
 */
export const SCALE_CATEGORIES: ScaleCategoryDef[] = [
  {
    key: 'very-detailed',
    label: 'Very detailed (≤ 1:5,000)',
    minScale: 0,
    maxScale: 5000,
  },
  {
    key: 'detailed',
    label: 'Detailed (1:5,000–15,000)',
    minScale: 5001,
    maxScale: 15000,
  },
  {
    key: 'standard',
    label: 'Standard (1:15,000–40,000)',
    minScale: 15001,
    maxScale: 40000,
  },
  {
    key: 'overview',
    label: 'Overview (> 1:40,000)',
    minScale: 40001,
    maxScale: Infinity,
  },
];

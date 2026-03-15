/**
 * Core photo types shared between API and frontend.
 * Ported from the original src/types/bindings.ts.
 */

/** Raw attributes from ArcGIS REST API feature response */
export interface PhotoAttributes {
  OBJECTID: number;
  Ession_Id: string;
  Photo_Name: string;
  Photo_Type: string;
  Run: string;
  Date_Flown: number;
  Scale: number;
  Film_Type: string;
  Altitude: number;
  Photo_No: string;
  Layer_Name: string;
  Shape__Area: number;
  Shape__Length: number;
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

/** Scale category for filtering */
export type ScaleCategory =
  | "very-large"
  | "large"
  | "medium"
  | "small"
  | "very-small";

/** Scale category definition */
export interface ScaleCategoryDef {
  key: ScaleCategory;
  label: string;
  minScale: number;
  maxScale: number;
}

/** Predefined scale categories */
export const SCALE_CATEGORIES: ScaleCategoryDef[] = [
  { key: "very-large", label: "< 1:5,000", minScale: 0, maxScale: 5000 },
  {
    key: "large",
    label: "1:5,000 - 1:15,000",
    minScale: 5000,
    maxScale: 15000,
  },
  {
    key: "medium",
    label: "1:15,000 - 1:30,000",
    minScale: 15000,
    maxScale: 30000,
  },
  {
    key: "small",
    label: "1:30,000 - 1:50,000",
    minScale: 30000,
    maxScale: 50000,
  },
  {
    key: "very-small",
    label: "> 1:50,000",
    minScale: 50000,
    maxScale: Infinity,
  },
];

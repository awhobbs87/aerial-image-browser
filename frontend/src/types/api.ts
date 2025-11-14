// Mirror backend types
export interface PhotoAttributes {
  OBJECTID: number;
  IMAGE_NAME: string;
  FLY_DATE?: number;
  FLY_SEASON?: string;
  SCALE?: number;
  RESOLUTION?: number;
  IMAGE_TYPE?: string;
  PROJ_NAME?: string;
  DOWNLOAD_LINK?: string;
  THUMBNAIL_LINK?: string;
  FILM_NO?: string;
  FRAME?: string;
  RUN_NO?: string;
  PROJECT_NO?: string;
  SCAN_TYPE?: string;
  SCAN_RES?: string;
  CAMERA?: string;
  CAMERA_NO?: string;
  FORMAT?: string;
  LENS_FL?: string;
  LENS_NO?: string;
  EASTING?: number;
  NORTHING?: number;
  HEIGHT?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export type LayerType = "aerial" | "ortho" | "digital";

export interface EnhancedPhoto extends PhotoAttributes {
  layerId: number;
  layerType: LayerType;
  dateFormatted: string | null;
  scaleFormatted: string | null;
  cached: boolean;
  thumbnailCached: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SearchLocationResponse {
  count: number;
  photos: EnhancedPhoto[];
}

export interface LayerInfo {
  id: number;
  name: string;
  type: string;
  description?: string;
}

export interface LayersResponse {
  layers: LayerInfo[];
}

// Search params
export interface FilterParams {
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
  minScale?: number;
  maxScale?: number;
  imageTypes?: string[]; // ["aerial", "ortho", "digital"]
}

export interface LocationSearchParams extends FilterParams {
  lat: number;
  lon: number;
  layers?: number[];
}

export interface BoundsSearchParams extends FilterParams {
  west: number;
  south: number;
  east: number;
  north: number;
  layers?: number[];
}

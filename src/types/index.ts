export interface Bindings {
  PHOTO_CACHE: KVNamespace;
  PHOTOS_DB: D1Database;
  TIFF_STORAGE: R2Bucket;
  THUMBNAIL_STORAGE: R2Bucket;
  API_BASE_URL: string;
}

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
  [key: string]: any;
}

export interface EnhancedPhoto extends PhotoAttributes {
  layerId: number;
  layerType: "aerial" | "ortho" | "digital";
  dateFormatted: string | null;
  scaleFormatted: string | null;
  cached: boolean;
  thumbnailCached: boolean;
}

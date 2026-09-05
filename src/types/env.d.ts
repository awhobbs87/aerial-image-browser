/// <reference types="astro/client" />

declare module 'geotiff-tilesource' {
  export function enableGeoTIFFTileSource(
    OpenSeadragon: object,
    options?: Record<string, unknown>,
  ): void;
}

/**
 * Cloudflare Workers bindings type augmentation.
 * These types match the bindings declared in wrangler.jsonc.
 *
 * Access in Astro endpoints:
 *   import { env } from 'cloudflare:workers';
 *   const kv = env.PHOTO_CACHE;
 */

interface CloudflareEnv {
  /** KV namespace for layer metadata cache, search history */
  PHOTO_CACHE: KVNamespace;

  /** D1 database for users, favorites, search history */
  PHOTOS_DB: D1Database;

  /** R2 bucket for TIFF files, WebP conversions, temp files */
  TIFF_STORAGE: R2Bucket;

  /** R2 bucket for thumbnail JPEGs */
  THUMBNAIL_STORAGE: R2Bucket;

  /** Workers AI binding (Llama 3 8B Instruct) */
  AI: Ai;

  /** ArcGIS MapServer base URL */
  API_BASE_URL: string;

  /** External TIFF conversion service URL (secret) */
  TIFF_CONVERSION_SERVICE_URL?: string;

  /** Cloudflare service binding to the TIFF tile Container Worker */
  TIFF_TILE_SERVICE?: Fetcher;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Env extends CloudflareEnv {}

declare namespace Cloudflare {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Env extends CloudflareEnv {}
}

declare module 'cloudflare:workers' {
  // Merge CloudflareEnv into CloudflareBindings so Astro endpoints can access bindings
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface CloudflareBindings extends CloudflareEnv {}

  export const env: CloudflareEnv;
}

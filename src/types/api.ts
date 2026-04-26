/**
 * API request/response types for Astro endpoints.
 */

import type { EnhancedPhoto, LayerInfo } from './photo';

/** Standard API error response */
export interface ApiError {
  error: string;
  message: string;
  status: number;
}

/** Health check response */
export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: number;
  bindings: {
    kv: boolean;
    d1: boolean;
    r2: boolean;
    ai: boolean;
  };
}

/** Layer metadata response */
export interface LayersResponse {
  layers: LayerInfo[];
  cachedAt?: number;
}

/** User info from CF Access JWT */
export interface UserInfo {
  id: string;
  email: string;
}

/** Location search params */
export interface LocationSearchParams {
  lat: number;
  lon: number;
  radius?: number;
  layers?: number[];
  startDate?: string;
  endDate?: string;
  minScale?: number;
  maxScale?: number;
  offset?: number;
  limit?: number;
}

/** Bounds search params */
export interface BoundsSearchParams {
  north: number;
  south: number;
  east: number;
  west: number;
  layers?: number[];
  startDate?: string;
  endDate?: string;
  minScale?: number;
  maxScale?: number;
  offset?: number;
  limit?: number;
}

/** Search response */
export interface SearchResponse {
  photos: EnhancedPhoto[];
  total: number;
  hasMore: boolean;
  searchTime: number;
}

/** Favorite record */
export interface Favorite {
  id: string;
  userId: string;
  photo: EnhancedPhoto;
  createdAt: number;
}

/** Search history entry */
export interface SearchHistoryEntry {
  id: string;
  userId: string;
  searchType: string;
  searchParams: string;
  resultsCount: number;
  createdAt: number;
}

/** AI search enhancement response */
export interface AISearchResponse {
  enhanced: boolean;
  originalQuery: string;
  parsedLocation?: string;
  parsedFilters?: {
    startYear?: number;
    endYear?: number;
    layers?: number[];
    scaleRange?: { min: number; max: number };
  };
  suggestion?: string;
}

/** TIFF conversion status */
export interface TiffConversionStatus {
  status: 'pending' | 'processing' | 'complete' | 'error';
  progress?: number;
  url?: string;
  error?: string;
}

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { api } from '@/lib/api-client';
import { useSearchStore } from '@/stores/searchStore';
import { useFilterStore } from '@/stores/filterStore';
import { filterPhotos } from '@/lib/photo-filters';
import type { EnhancedPhoto } from '@/types/photo';

interface SearchData {
  count: number;
  photos: EnhancedPhoto[];
}
interface SearchResponse {
  success: boolean;
  data: SearchData;
}
interface UsePhotosOptions {
  enabled?: boolean;
}

interface BrowserPhotoCacheEntry {
  data: SearchData;
  updatedAt: number;
}

type PhotoCacheWindow = Window & {
  __tasAerialPhotoCache?: Map<string, BrowserPhotoCacheEntry>;
};
const PHOTO_SESSION_KEY = 'tas-aerial-photo-cache-v1';

function getBrowserPhotoCache() {
  if (typeof window === 'undefined') return undefined;
  const browserWindow = window as PhotoCacheWindow;
  return (browserWindow.__tasAerialPhotoCache ??= new Map());
}

function readBrowserPhotos(key: string) {
  const cache = getBrowserPhotoCache();
  let entry = cache?.get(key);
  if (!entry && typeof sessionStorage !== 'undefined') {
    try {
      const stored = JSON.parse(sessionStorage.getItem(PHOTO_SESSION_KEY) || 'null') as
        | (BrowserPhotoCacheEntry & { key: string })
        | null;
      if (stored?.key === key) {
        entry = stored;
        cache?.set(key, stored);
      }
    } catch {
      /* Storage may be unavailable or contain an interrupted write. */
    }
  }
  if (!entry) return undefined;
  if (Date.now() - entry.updatedAt < 5 * 60 * 1000) return entry;
  cache?.delete(key);
  try {
    sessionStorage.removeItem(PHOTO_SESSION_KEY);
  } catch {
    /* Storage may be unavailable. */
  }
  return undefined;
}

function rememberBrowserPhotos(key: string, data: SearchData) {
  const cache = getBrowserPhotoCache();
  if (!cache) return;
  cache.delete(key);
  const entry = { data, updatedAt: Date.now() };
  cache.set(key, entry);
  if (cache.size > 3) cache.delete(cache.keys().next().value!);
  try {
    sessionStorage.setItem(PHOTO_SESSION_KEY, JSON.stringify({ key, ...entry }));
  } catch {
    /* Keep the in-memory cache when storage quota or privacy settings reject the write. */
  }
}

function usePhotoSelection() {
  const filters = useFilterStore(
    useShallow(({ layers, startYear, endYear, scaleCategories }) => ({
      layers,
      startYear,
      endYear,
      scaleCategories,
    })),
  );
  return useCallback(
    (data: SearchData): SearchData => {
      const photos = filterPhotos(data.photos, filters);
      return { count: photos.length, photos };
    },
    [filters],
  );
}

export function usePhotos(options: UsePhotosOptions = {}) {
  const { lat, lon } = useSearchStore(useShallow(({ lat, lon }) => ({ lat, lon })));
  const select = usePhotoSelection();
  const browserCacheKey = lat !== null && lon !== null ? `${lat}:${lon}` : '';
  const browserCache = browserCacheKey ? readBrowserPhotos(browserCacheKey) : undefined;
  return useQuery({
    queryKey: ['photos', 'location', lat, lon],
    queryFn: async ({ signal }): Promise<SearchData> => {
      if (lat === null || lon === null) throw new Error('No location set');
      const cached = readBrowserPhotos(`${lat}:${lon}`);
      if (cached) return cached.data;
      const data = (
        await api.get<SearchResponse>('/api/search/location', { lat, lon, layers: '0,1,2' }, signal)
      ).data;
      rememberBrowserPhotos(`${lat}:${lon}`, data);
      return data;
    },
    select,
    enabled: lat !== null && lon !== null && options.enabled !== false,
    initialData: browserCache?.data,
    initialDataUpdatedAt: browserCache?.updatedAt,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
  });
}

export function usePhotosByBounds(
  bounds: { north: number; south: number; east: number; west: number } | null,
  options: UsePhotosOptions = {},
) {
  const select = usePhotoSelection();
  return useQuery({
    queryKey: ['photos', 'bounds', bounds],
    queryFn: async ({ signal }): Promise<SearchData> => {
      if (!bounds) throw new Error('No bounds set');
      return (
        await api.get<SearchResponse>('/api/search/bounds', { ...bounds, layers: '0,1,2' }, signal)
      ).data;
    },
    select,
    enabled: bounds !== null && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });
}

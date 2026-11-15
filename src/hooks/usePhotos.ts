import { useCallback, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import { api } from '@/lib/api-client';
import { useSearchStore } from '@/stores/searchStore';
import { useFilterStore } from '@/stores/filterStore';
import { filterPhotos } from '@/lib/photo-filters';

import type { SearchData, SearchResponse } from '@/types/api';
import type { MapBounds } from '@/types/map';
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
const PHOTO_SESSION_KEY = 'tas-aerial-photo-cache-v2';

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
    useShallow(
      ({
        layers,
        startYear,
        endYear,
        scaleCategories,
        includeUnknownDates,
        includeUnknownScales,
        survey,
      }) => ({
        layers,
        startYear,
        endYear,
        scaleCategories,
        includeUnknownDates,
        includeUnknownScales,
        survey,
      }),
    ),
  );
  return useCallback(
    (data: SearchData) => {
      const photos = filterPhotos(data.photos, filters);
      return {
        ...data,
        count: photos.length,
        photos,
        availablePhotos: data.photos,
        total: data.count,
      };
    },
    [filters],
  );
}

function usePhotoQuery(
  lat: number | null,
  lon: number | null,
  bounds: MapBounds | null,
  options: UsePhotosOptions,
) {
  const client = useQueryClient();
  const select = usePhotoSelection();
  const key = bounds ? `bounds:${JSON.stringify(bounds)}` : `${lat}:${lon}`;
  const queryKey = ['photos', bounds ? 'bounds' : 'location', key];
  const mode = useRef<'normal' | 'refresh' | 'failed'>('normal');
  const browserCache = useMemo(() => readBrowserPhotos(key), [key]);
  const result = useQuery({
    queryKey,
    queryFn: async ({ signal }): Promise<SearchData> => {
      const action = mode.current;
      const previous = client.getQueryData<SearchData>(queryKey);
      if (action === 'normal') {
        const cached = readBrowserPhotos(key);
        if (cached) return cached.data;
      }
      const retryLayers = action === 'failed' ? previous?.failedLayers : undefined;
      const layers = retryLayers?.length ? retryLayers : [0, 1, 2];
      const data = (
        await api.get<SearchResponse>(
          bounds ? '/api/search/bounds' : '/api/search/location',
          {
            ...(bounds || { lat: lat!, lon: lon! }),
            layers: layers.join(','),
            refresh: action !== 'normal' || undefined,
          },
          signal,
        )
      ).data;
      const merged =
        retryLayers?.length && previous
          ? {
              ...data,
              photos: [
                ...previous.photos.filter((photo) => !layers.includes(photo.layerId)),
                ...data.photos,
              ],
            }
          : data;
      merged.count = merged.photos.length;
      if (!merged.failedLayers?.length) rememberBrowserPhotos(key, merged);
      else {
        getBrowserPhotoCache()?.delete(key);
        try {
          sessionStorage.removeItem(PHOTO_SESSION_KEY);
        } catch {
          /* Storage unavailable. */
        }
      }
      return merged;
    },
    select,
    enabled: lat !== null && lon !== null && options.enabled !== false,
    initialData: browserCache?.data,
    initialDataUpdatedAt: browserCache?.updatedAt,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    retry: 1,
  });
  const refresh = async (failedOnly = false) => {
    if (result.isFetching) return;
    mode.current = failedOnly ? 'failed' : 'refresh';
    try {
      await result.refetch();
    } finally {
      mode.current = 'normal';
    }
  };
  return { ...result, refresh };
}
export function usePhotos(options: UsePhotosOptions = {}) {
  const { lat, lon, bounds } = useSearchStore(
    useShallow(({ lat, lon, bounds }) => ({ lat, lon, bounds })),
  );
  return usePhotoQuery(lat, lon, bounds, options);
}
export function usePhotosByBounds(bounds: MapBounds | null, options: UsePhotosOptions = {}) {
  return usePhotoQuery(
    bounds ? (bounds.north + bounds.south) / 2 : null,
    bounds ? (bounds.east + bounds.west) / 2 : null,
    bounds,
    options,
  );
}

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
  return useQuery({
    queryKey: ['photos', 'location', lat, lon],
    queryFn: async ({ signal }): Promise<SearchData> => {
      if (lat === null || lon === null) throw new Error('No location set');
      return (
        await api.get<SearchResponse>('/api/search/location', { lat, lon, layers: '0,1,2' }, signal)
      ).data;
    },
    select,
    enabled: lat !== null && lon !== null && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
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
  });
}

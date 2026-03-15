import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useSearchStore } from '@/stores/searchStore';
import { useFilterStore } from '@/stores/filterStore';
import type { EnhancedPhoto } from '@/types/photo';

interface SearchResponse {
  success: boolean;
  data: {
    count: number;
    photos: EnhancedPhoto[];
  };
}

interface UsePhotosOptions {
  enabled?: boolean;
}

export function usePhotos(options: UsePhotosOptions = {}) {
  const { lat, lon } = useSearchStore();
  const { layers, startYear, endYear, scaleCategories } = useFilterStore();

  const hasLocation = lat !== null && lon !== null;

  return useQuery({
    queryKey: ['photos', 'location', lat, lon, layers, startYear, endYear, scaleCategories],
    queryFn: async (): Promise<SearchResponse['data']> => {
      if (!hasLocation) throw new Error('No location set');

      const params: Record<string, string | number | boolean | undefined> = {
        lat: lat!,
        lon: lon!,
        layers: layers.join(','),
      };

      if (startYear) {
        params.startDate = new Date(startYear, 0, 1).toISOString();
      }
      if (endYear) {
        params.endDate = new Date(endYear, 11, 31).toISOString();
      }

      const response = await api.get<SearchResponse>('/api/search/location', params);
      return response.data;
    },
    enabled: hasLocation && (options.enabled !== false),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function usePhotosByBounds(bounds: { north: number; south: number; east: number; west: number } | null, options: UsePhotosOptions = {}) {
  const { layers, startYear, endYear } = useFilterStore();

  return useQuery({
    queryKey: ['photos', 'bounds', bounds, layers, startYear, endYear],
    queryFn: async (): Promise<SearchResponse['data']> => {
      if (!bounds) throw new Error('No bounds set');

      const params: Record<string, string | number | boolean | undefined> = {
        north: bounds.north,
        south: bounds.south,
        east: bounds.east,
        west: bounds.west,
        layers: layers.join(','),
      };

      if (startYear) {
        params.startDate = new Date(startYear, 0, 1).toISOString();
      }
      if (endYear) {
        params.endDate = new Date(endYear, 11, 31).toISOString();
      }

      const response = await api.get<SearchResponse>('/api/search/bounds', params);
      return response.data;
    },
    enabled: bounds !== null && (options.enabled !== false),
    staleTime: 5 * 60 * 1000,
  });
}

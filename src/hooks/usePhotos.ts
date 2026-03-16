import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useSearchStore } from '@/stores/searchStore';
import { useFilterStore } from '@/stores/filterStore';
import type { EnhancedPhoto } from '@/types/photo';
import { SCALE_CATEGORIES } from '@/types/photo';

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

/**
 * Resolve selected scale category keys to a { minScale, maxScale } range.
 * When multiple categories are selected the union (overall min/max) is used.
 * Returns an empty object when no categories are selected (no scale constraint).
 */
function resolveScaleRange(scaleCategories: string[]): { minScale?: number; maxScale?: number } {
  if (scaleCategories.length === 0) return {};

  const selected = SCALE_CATEGORIES.filter((c) => scaleCategories.includes(c.key));
  if (selected.length === 0) return {};

  const minScale = Math.min(...selected.map((c) => c.minScale));
  const maxScale = Math.max(...selected.map((c) => c.maxScale));

  return {
    minScale: minScale > 0 ? minScale : undefined,
    maxScale: isFinite(maxScale) ? maxScale : undefined,
  };
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

      const { minScale, maxScale } = resolveScaleRange(scaleCategories);
      if (minScale !== undefined) params.minScale = minScale;
      if (maxScale !== undefined) params.maxScale = maxScale;

      const response = await api.get<SearchResponse>('/api/search/location', params);
      return response.data;
    },
    enabled: hasLocation && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function usePhotosByBounds(
  bounds: { north: number; south: number; east: number; west: number } | null,
  options: UsePhotosOptions = {},
) {
  const { layers, startYear, endYear, scaleCategories } = useFilterStore();

  return useQuery({
    queryKey: ['photos', 'bounds', bounds, layers, startYear, endYear, scaleCategories],
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

      const { minScale, maxScale } = resolveScaleRange(scaleCategories);
      if (minScale !== undefined) params.minScale = minScale;
      if (maxScale !== undefined) params.maxScale = maxScale;

      const response = await api.get<SearchResponse>('/api/search/bounds', params);
      return response.data;
    },
    enabled: bounds !== null && options.enabled !== false,
    staleTime: 5 * 60 * 1000,
  });
}

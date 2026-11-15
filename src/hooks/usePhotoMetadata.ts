import { useQuery } from '@tanstack/react-query';
import type { EnhancedPhoto } from '@/types/photo';
import { api } from '@/lib/api-client';
export function usePhotoMetadata(layerId: number, imageName: string, initial?: EnhancedPhoto) {
  return useQuery({
    queryKey: ['photo-metadata', layerId, imageName],
    queryFn: ({ signal }) =>
      api.get<EnhancedPhoto>(
        `/api/images/metadata/${layerId}/${encodeURIComponent(imageName)}`,
        undefined,
        signal,
      ),
    initialData: initial,
    staleTime: 5 * 60 * 1000,
  });
}

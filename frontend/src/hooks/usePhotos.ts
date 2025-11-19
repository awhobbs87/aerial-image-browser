import { useQuery } from "@tanstack/react-query";
import apiClient from "../lib/apiClient";
import type {
  LocationSearchParams,
  LayersResponse,
} from "../types/api";

/**
 * Hook to search photos by location (lat/lon)
 */
export function useSearchLocation(params: LocationSearchParams | null) {
  return useQuery({
    queryKey: ["photos", "location", params],
    queryFn: () => apiClient.searchByLocation(params!),
    enabled: params !== null && !isNaN(params.lat) && !isNaN(params.lon),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get available layers metadata
 */
export function useLayers() {
  return useQuery<LayersResponse>({
    queryKey: ["layers"],
    queryFn: () => apiClient.getLayers(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

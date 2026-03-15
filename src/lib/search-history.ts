/**
 * Client-side search history manager.
 * Wraps API calls to /api/search-history endpoints.
 */

import { api } from './api-client';

export interface SearchHistoryItem {
  id: string;
  query: string;
  lat: number;
  lon: number;
  timestamp: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  const response = await api.get<ApiResponse<SearchHistoryItem[]>>('/api/search-history');
  return response.data;
}

export async function addSearchHistory(
  query: string,
  lat: number,
  lon: number,
): Promise<SearchHistoryItem> {
  const response = await api.post<ApiResponse<SearchHistoryItem>>('/api/search-history', {
    query,
    lat,
    lon,
  });
  return response.data;
}

export async function deleteSearchHistory(itemId: string): Promise<void> {
  await api.delete<ApiResponse<void>>(`/api/search-history/${itemId}`);
}

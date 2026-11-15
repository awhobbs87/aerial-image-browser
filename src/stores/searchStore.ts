import type { MapBounds } from '@/types/map';
import { create } from 'zustand';
import type { EnhancedPhoto } from '../types/photo';

interface SearchState {
  bounds: MapBounds | null;
  frameBounds: MapBounds | null;
  setBounds: (bounds: MapBounds) => void;
  setFrameBounds: (bounds: MapBounds | null) => void;
  query: string;
  lat: number | null;
  lon: number | null;
  radius: number;
  photos: EnhancedPhoto[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;

  setQuery: (query: string) => void;
  setLocation: (lat: number, lon: number) => void;
  setRadius: (radius: number) => void;
  setPhotos: (photos: EnhancedPhoto[], total: number, hasMore: boolean) => void;
  appendPhotos: (photos: EnhancedPhoto[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  bounds: null as MapBounds | null,
  frameBounds: null as MapBounds | null,
  query: '',
  lat: null as number | null,
  lon: null as number | null,
  radius: 2000,
  photos: [] as EnhancedPhoto[],
  total: 0,
  hasMore: false,
  isLoading: false,
  error: null as string | null,
};

export const useSearchStore = create<SearchState>((set) => ({
  ...initialState,

  setQuery: (query) => set({ query }),
  setLocation: (lat, lon) => set({ lat, lon, bounds: null, frameBounds: null }),
  setBounds: (bounds) =>
    set({
      bounds,
      frameBounds: null,
      lat: (bounds.north + bounds.south) / 2,
      lon: (bounds.east + bounds.west) / 2,
      query: 'Visible map area',
    }),
  setFrameBounds: (frameBounds) => set({ frameBounds }),
  setRadius: (radius) => set({ radius }),
  setPhotos: (photos, total, hasMore) => set({ photos, total, hasMore, error: null }),
  appendPhotos: (photos) => set((state) => ({ photos: [...state.photos, ...photos] })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set(initialState),
}));

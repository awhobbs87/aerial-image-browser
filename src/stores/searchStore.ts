import { create } from "zustand";
import type { EnhancedPhoto } from "../types/photo";

interface SearchState {
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
  query: "",
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
  setLocation: (lat, lon) => set({ lat, lon }),
  setRadius: (radius) => set({ radius }),
  setPhotos: (photos, total, hasMore) =>
    set({ photos, total, hasMore, error: null }),
  appendPhotos: (photos) =>
    set((state) => ({ photos: [...state.photos, ...photos] })),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set(initialState),
}));

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EnhancedPhoto } from "../types/photo";

interface FavoritesState {
  favorites: EnhancedPhoto[];
  isFavorite: (objectId: number, layerId: number) => boolean;
  addFavorite: (photo: EnhancedPhoto) => void;
  removeFavorite: (objectId: number, layerId: number) => void;
  toggleFavorite: (photo: EnhancedPhoto) => void;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      isFavorite: (objectId, layerId) =>
        get().favorites.some(
          (f) => f.objectId === objectId && f.layerId === layerId,
        ),

      addFavorite: (photo) =>
        set((state) => {
          if (
            state.favorites.some(
              (f) =>
                f.objectId === photo.objectId && f.layerId === photo.layerId,
            )
          ) {
            return state;
          }
          return { favorites: [...state.favorites, photo] };
        }),

      removeFavorite: (objectId, layerId) =>
        set((state) => ({
          favorites: state.favorites.filter(
            (f) => !(f.objectId === objectId && f.layerId === layerId),
          ),
        })),

      toggleFavorite: (photo) => {
        const { isFavorite, addFavorite, removeFavorite } = get();
        if (isFavorite(photo.objectId, photo.layerId)) {
          removeFavorite(photo.objectId, photo.layerId);
        } else {
          addFavorite(photo);
        }
      },

      clearFavorites: () => set({ favorites: [] }),
    }),
    { name: "tas-aerial-favorites" },
  ),
);

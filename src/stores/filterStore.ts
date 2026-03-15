import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ScaleCategory } from "../types/photo";

interface FilterState {
  layers: number[];
  startYear: number | null;
  endYear: number | null;
  scaleCategories: ScaleCategory[];
  sortBy: "date-asc" | "date-desc" | "scale-asc" | "scale-desc" | "name";

  setLayers: (layers: number[]) => void;
  toggleLayer: (layerId: number) => void;
  setDateRange: (startYear: number | null, endYear: number | null) => void;
  setScaleCategories: (categories: ScaleCategory[]) => void;
  toggleScaleCategory: (category: ScaleCategory) => void;
  setSortBy: (sortBy: FilterState["sortBy"]) => void;
  resetFilters: () => void;
}

const initialFilters = {
  layers: [0, 1, 2],
  startYear: null as number | null,
  endYear: null as number | null,
  scaleCategories: [] as ScaleCategory[],
  sortBy: "date-desc" as const,
};

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      ...initialFilters,

      setLayers: (layers) => set({ layers }),
      toggleLayer: (layerId) =>
        set((state) => ({
          layers: state.layers.includes(layerId)
            ? state.layers.filter((l) => l !== layerId)
            : [...state.layers, layerId],
        })),
      setDateRange: (startYear, endYear) => set({ startYear, endYear }),
      setScaleCategories: (scaleCategories) => set({ scaleCategories }),
      toggleScaleCategory: (category) =>
        set((state) => ({
          scaleCategories: state.scaleCategories.includes(category)
            ? state.scaleCategories.filter((c) => c !== category)
            : [...state.scaleCategories, category],
        })),
      setSortBy: (sortBy) => set({ sortBy }),
      resetFilters: () => set(initialFilters),
    }),
    { name: "tas-aerial-filters" },
  ),
);

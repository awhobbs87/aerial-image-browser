import { create } from "zustand";

type ViewMode = "grid" | "timeline";

interface UIState {
  viewMode: ViewMode;
  filterPanelOpen: boolean;
  searchFocused: boolean;
  mapExpanded: boolean;

  setViewMode: (mode: ViewMode) => void;
  toggleFilterPanel: () => void;
  setFilterPanelOpen: (open: boolean) => void;
  setSearchFocused: (focused: boolean) => void;
  setMapExpanded: (expanded: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: "grid",
  filterPanelOpen: false,
  searchFocused: false,
  mapExpanded: false,

  setViewMode: (viewMode) => set({ viewMode }),
  toggleFilterPanel: () =>
    set((s) => ({ filterPanelOpen: !s.filterPanelOpen })),
  setFilterPanelOpen: (filterPanelOpen) => set({ filterPanelOpen }),
  setSearchFocused: (searchFocused) => set({ searchFocused }),
  setMapExpanded: (mapExpanded) => set({ mapExpanded }),
}));

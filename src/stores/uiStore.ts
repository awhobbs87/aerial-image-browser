import { create } from 'zustand';

type ViewMode = 'grid' | 'timeline';

interface UIState {
  viewMode: ViewMode;
  filterPanelOpen: boolean;
  searchFocused: boolean;
  mapExpanded: boolean;
  /** objectId of the photo card currently being hovered — drives map footprint highlight */
  hoveredPhotoId: number | null;

  setViewMode: (mode: ViewMode) => void;
  toggleFilterPanel: () => void;
  setFilterPanelOpen: (open: boolean) => void;
  setSearchFocused: (focused: boolean) => void;
  setMapExpanded: (expanded: boolean) => void;
  setHoveredPhotoId: (id: number | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'grid',
  filterPanelOpen: false,
  searchFocused: false,
  mapExpanded: false,
  hoveredPhotoId: null,

  setViewMode: (viewMode) => set({ viewMode }),
  toggleFilterPanel: () => set((s) => ({ filterPanelOpen: !s.filterPanelOpen })),
  setFilterPanelOpen: (filterPanelOpen) => set({ filterPanelOpen }),
  setSearchFocused: (searchFocused) => set({ searchFocused }),
  setMapExpanded: (mapExpanded) => set({ mapExpanded }),
  setHoveredPhotoId: (hoveredPhotoId) => set({ hoveredPhotoId }),
}));

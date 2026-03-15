import { useUIStore } from "@/stores/uiStore";

const initialState = {
  viewMode: "grid" as const,
  filterPanelOpen: false,
  searchFocused: false,
  mapExpanded: false,
};

describe("uiStore", () => {
  beforeEach(() => {
    useUIStore.setState(initialState);
  });

  describe("initial state", () => {
    it("has viewMode grid", () => {
      expect(useUIStore.getState().viewMode).toBe("grid");
    });

    it("has filterPanelOpen false", () => {
      expect(useUIStore.getState().filterPanelOpen).toBe(false);
    });

    it("has searchFocused false", () => {
      expect(useUIStore.getState().searchFocused).toBe(false);
    });

    it("has mapExpanded false", () => {
      expect(useUIStore.getState().mapExpanded).toBe(false);
    });
  });

  describe("setViewMode", () => {
    it("changes to timeline", () => {
      useUIStore.getState().setViewMode("timeline");
      expect(useUIStore.getState().viewMode).toBe("timeline");
    });

    it("changes back to grid", () => {
      useUIStore.getState().setViewMode("timeline");
      useUIStore.getState().setViewMode("grid");
      expect(useUIStore.getState().viewMode).toBe("grid");
    });
  });

  describe("toggleFilterPanel", () => {
    it("flips false to true", () => {
      useUIStore.getState().toggleFilterPanel();
      expect(useUIStore.getState().filterPanelOpen).toBe(true);
    });

    it("flips true to false", () => {
      useUIStore.getState().toggleFilterPanel();
      useUIStore.getState().toggleFilterPanel();
      expect(useUIStore.getState().filterPanelOpen).toBe(false);
    });
  });

  describe("setFilterPanelOpen", () => {
    it("sets to true", () => {
      useUIStore.getState().setFilterPanelOpen(true);
      expect(useUIStore.getState().filterPanelOpen).toBe(true);
    });

    it("sets to false", () => {
      useUIStore.getState().setFilterPanelOpen(true);
      useUIStore.getState().setFilterPanelOpen(false);
      expect(useUIStore.getState().filterPanelOpen).toBe(false);
    });
  });

  describe("setSearchFocused", () => {
    it("sets to true", () => {
      useUIStore.getState().setSearchFocused(true);
      expect(useUIStore.getState().searchFocused).toBe(true);
    });

    it("sets to false", () => {
      useUIStore.getState().setSearchFocused(true);
      useUIStore.getState().setSearchFocused(false);
      expect(useUIStore.getState().searchFocused).toBe(false);
    });
  });

  describe("setMapExpanded", () => {
    it("sets to true", () => {
      useUIStore.getState().setMapExpanded(true);
      expect(useUIStore.getState().mapExpanded).toBe(true);
    });

    it("sets to false", () => {
      useUIStore.getState().setMapExpanded(true);
      useUIStore.getState().setMapExpanded(false);
      expect(useUIStore.getState().mapExpanded).toBe(false);
    });
  });
});

import { useFilterStore } from "@/stores/filterStore";
import type { ScaleCategory } from "@/types/photo";

const initialFilters = {
  layers: [0, 1, 2],
  startYear: null as number | null,
  endYear: null as number | null,
  scaleCategories: [] as ScaleCategory[],
  sortBy: "date-desc" as const,
};

describe("filterStore", () => {
  beforeEach(() => {
    useFilterStore.setState(initialFilters);
  });

  describe("initial state", () => {
    it("has layers [0, 1, 2]", () => {
      expect(useFilterStore.getState().layers).toEqual([0, 1, 2]);
    });

    it("has null startYear", () => {
      expect(useFilterStore.getState().startYear).toBeNull();
    });

    it("has null endYear", () => {
      expect(useFilterStore.getState().endYear).toBeNull();
    });

    it("has empty scaleCategories", () => {
      expect(useFilterStore.getState().scaleCategories).toEqual([]);
    });

    it("has sortBy date-desc", () => {
      expect(useFilterStore.getState().sortBy).toBe("date-desc");
    });
  });

  describe("setLayers", () => {
    it("replaces layers array", () => {
      useFilterStore.getState().setLayers([0, 2]);
      expect(useFilterStore.getState().layers).toEqual([0, 2]);
    });

    it("can set to empty array", () => {
      useFilterStore.getState().setLayers([]);
      expect(useFilterStore.getState().layers).toEqual([]);
    });

    it("can set single layer", () => {
      useFilterStore.getState().setLayers([1]);
      expect(useFilterStore.getState().layers).toEqual([1]);
    });
  });

  describe("toggleLayer", () => {
    it("removes layer if present", () => {
      useFilterStore.getState().toggleLayer(1);
      expect(useFilterStore.getState().layers).toEqual([0, 2]);
    });

    it("adds layer if not present", () => {
      useFilterStore.getState().setLayers([0]);
      useFilterStore.getState().toggleLayer(2);
      expect(useFilterStore.getState().layers).toEqual([0, 2]);
    });

    it("can toggle off all layers", () => {
      useFilterStore.getState().toggleLayer(0);
      useFilterStore.getState().toggleLayer(1);
      useFilterStore.getState().toggleLayer(2);
      expect(useFilterStore.getState().layers).toEqual([]);
    });

    it("can toggle a layer back on", () => {
      useFilterStore.getState().toggleLayer(1); // remove
      useFilterStore.getState().toggleLayer(1); // add back
      expect(useFilterStore.getState().layers).toContain(1);
    });
  });

  describe("setDateRange", () => {
    it("updates start and end year", () => {
      useFilterStore.getState().setDateRange(1950, 2000);
      const { startYear, endYear } = useFilterStore.getState();
      expect(startYear).toBe(1950);
      expect(endYear).toBe(2000);
    });

    it("can set to null values", () => {
      useFilterStore.getState().setDateRange(1950, 2000);
      useFilterStore.getState().setDateRange(null, null);
      expect(useFilterStore.getState().startYear).toBeNull();
      expect(useFilterStore.getState().endYear).toBeNull();
    });

    it("can set only start year", () => {
      useFilterStore.getState().setDateRange(1960, null);
      expect(useFilterStore.getState().startYear).toBe(1960);
      expect(useFilterStore.getState().endYear).toBeNull();
    });

    it("can set only end year", () => {
      useFilterStore.getState().setDateRange(null, 2020);
      expect(useFilterStore.getState().startYear).toBeNull();
      expect(useFilterStore.getState().endYear).toBe(2020);
    });
  });

  describe("setScaleCategories", () => {
    it("replaces categories", () => {
      const categories: ScaleCategory[] = ["large", "medium"];
      useFilterStore.getState().setScaleCategories(categories);
      expect(useFilterStore.getState().scaleCategories).toEqual(categories);
    });

    it("can set to empty", () => {
      useFilterStore.getState().setScaleCategories(["large"]);
      useFilterStore.getState().setScaleCategories([]);
      expect(useFilterStore.getState().scaleCategories).toEqual([]);
    });
  });

  describe("toggleScaleCategory", () => {
    it("adds category if not present", () => {
      useFilterStore.getState().toggleScaleCategory("large");
      expect(useFilterStore.getState().scaleCategories).toEqual(["large"]);
    });

    it("removes category if present", () => {
      useFilterStore.getState().setScaleCategories(["large", "medium"]);
      useFilterStore.getState().toggleScaleCategory("large");
      expect(useFilterStore.getState().scaleCategories).toEqual(["medium"]);
    });

    it("can add multiple categories by toggling", () => {
      useFilterStore.getState().toggleScaleCategory("small");
      useFilterStore.getState().toggleScaleCategory("very-small");
      expect(useFilterStore.getState().scaleCategories).toEqual([
        "small",
        "very-small",
      ]);
    });

    it("toggling same category twice returns to original", () => {
      useFilterStore.getState().toggleScaleCategory("medium");
      useFilterStore.getState().toggleScaleCategory("medium");
      expect(useFilterStore.getState().scaleCategories).toEqual([]);
    });
  });

  describe("setSortBy", () => {
    it("updates sort to date-asc", () => {
      useFilterStore.getState().setSortBy("date-asc");
      expect(useFilterStore.getState().sortBy).toBe("date-asc");
    });

    it("updates sort to scale-asc", () => {
      useFilterStore.getState().setSortBy("scale-asc");
      expect(useFilterStore.getState().sortBy).toBe("scale-asc");
    });

    it("updates sort to scale-desc", () => {
      useFilterStore.getState().setSortBy("scale-desc");
      expect(useFilterStore.getState().sortBy).toBe("scale-desc");
    });

    it("updates sort to name", () => {
      useFilterStore.getState().setSortBy("name");
      expect(useFilterStore.getState().sortBy).toBe("name");
    });
  });

  describe("resetFilters", () => {
    it("returns to initial state", () => {
      useFilterStore.getState().setLayers([0]);
      useFilterStore.getState().setDateRange(1960, 2010);
      useFilterStore.getState().setScaleCategories(["large", "medium"]);
      useFilterStore.getState().setSortBy("name");

      useFilterStore.getState().resetFilters();

      const state = useFilterStore.getState();
      expect(state.layers).toEqual([0, 1, 2]);
      expect(state.startYear).toBeNull();
      expect(state.endYear).toBeNull();
      expect(state.scaleCategories).toEqual([]);
      expect(state.sortBy).toBe("date-desc");
    });
  });
});

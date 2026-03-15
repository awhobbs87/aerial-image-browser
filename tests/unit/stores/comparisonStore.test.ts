import { useComparisonStore } from "@/stores/comparisonStore";
import type { EnhancedPhoto } from "@/types/photo";

const mockPhotoA: EnhancedPhoto = {
  objectId: 1,
  layerId: 0,
  name: "TEST_001",
  type: "aerial",
  run: "R1",
  dateFlown: 946684800000,
  year: 2000,
  scale: 15000,
  filmType: "BW",
  altitude: 5000,
  photoNo: "001",
  layerName: "Aerial Photos",
  area: 1000,
  thumbnailUrl: "/thumb/0/TEST_001",
  imageUrl: "/img/0/TEST_001",
  tiffUrl: "/tiff/0/TEST_001",
  rings: [
    [
      [147.0, -42.0],
      [147.1, -42.0],
      [147.1, -42.1],
      [147.0, -42.1],
      [147.0, -42.0],
    ],
  ],
};

const mockPhotoB: EnhancedPhoto = {
  ...mockPhotoA,
  objectId: 2,
  name: "TEST_002",
  year: 2020,
  dateFlown: 1577836800000,
  photoNo: "002",
};

const initialState = {
  mode: "slider" as const,
  photoA: null,
  photoB: null,
  isSelecting: false,
};

describe("comparisonStore", () => {
  beforeEach(() => {
    useComparisonStore.setState(initialState);
  });

  describe("initial state", () => {
    it("has mode slider", () => {
      expect(useComparisonStore.getState().mode).toBe("slider");
    });

    it("has null photoA", () => {
      expect(useComparisonStore.getState().photoA).toBeNull();
    });

    it("has null photoB", () => {
      expect(useComparisonStore.getState().photoB).toBeNull();
    });

    it("is not selecting", () => {
      expect(useComparisonStore.getState().isSelecting).toBe(false);
    });
  });

  describe("setMode", () => {
    it("changes to side-by-side", () => {
      useComparisonStore.getState().setMode("side-by-side");
      expect(useComparisonStore.getState().mode).toBe("side-by-side");
    });

    it("changes to then-now", () => {
      useComparisonStore.getState().setMode("then-now");
      expect(useComparisonStore.getState().mode).toBe("then-now");
    });

    it("changes back to slider", () => {
      useComparisonStore.getState().setMode("then-now");
      useComparisonStore.getState().setMode("slider");
      expect(useComparisonStore.getState().mode).toBe("slider");
    });
  });

  describe("setPhotoA", () => {
    it("sets photo A", () => {
      useComparisonStore.getState().setPhotoA(mockPhotoA);
      expect(useComparisonStore.getState().photoA).toEqual(mockPhotoA);
    });

    it("can set to null", () => {
      useComparisonStore.getState().setPhotoA(mockPhotoA);
      useComparisonStore.getState().setPhotoA(null);
      expect(useComparisonStore.getState().photoA).toBeNull();
    });

    it("does not affect photoB", () => {
      useComparisonStore.getState().setPhotoB(mockPhotoB);
      useComparisonStore.getState().setPhotoA(mockPhotoA);
      expect(useComparisonStore.getState().photoB).toEqual(mockPhotoB);
    });
  });

  describe("setPhotoB", () => {
    it("sets photo B", () => {
      useComparisonStore.getState().setPhotoB(mockPhotoB);
      expect(useComparisonStore.getState().photoB).toEqual(mockPhotoB);
    });

    it("can set to null", () => {
      useComparisonStore.getState().setPhotoB(mockPhotoB);
      useComparisonStore.getState().setPhotoB(null);
      expect(useComparisonStore.getState().photoB).toBeNull();
    });

    it("does not affect photoA", () => {
      useComparisonStore.getState().setPhotoA(mockPhotoA);
      useComparisonStore.getState().setPhotoB(mockPhotoB);
      expect(useComparisonStore.getState().photoA).toEqual(mockPhotoA);
    });
  });

  describe("startSelecting", () => {
    it("sets isSelecting to true", () => {
      useComparisonStore.getState().startSelecting();
      expect(useComparisonStore.getState().isSelecting).toBe(true);
    });
  });

  describe("stopSelecting", () => {
    it("sets isSelecting to false", () => {
      useComparisonStore.getState().startSelecting();
      useComparisonStore.getState().stopSelecting();
      expect(useComparisonStore.getState().isSelecting).toBe(false);
    });
  });

  describe("clear", () => {
    it("resets photos to null", () => {
      useComparisonStore.getState().setPhotoA(mockPhotoA);
      useComparisonStore.getState().setPhotoB(mockPhotoB);
      useComparisonStore.getState().clear();
      expect(useComparisonStore.getState().photoA).toBeNull();
      expect(useComparisonStore.getState().photoB).toBeNull();
    });

    it("resets isSelecting to false", () => {
      useComparisonStore.getState().startSelecting();
      useComparisonStore.getState().clear();
      expect(useComparisonStore.getState().isSelecting).toBe(false);
    });

    it("does not reset mode", () => {
      useComparisonStore.getState().setMode("side-by-side");
      useComparisonStore.getState().setPhotoA(mockPhotoA);
      useComparisonStore.getState().clear();
      expect(useComparisonStore.getState().mode).toBe("side-by-side");
    });
  });
});

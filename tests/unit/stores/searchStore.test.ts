import { useSearchStore } from "@/stores/searchStore";
import type { EnhancedPhoto } from "@/types/photo";

const mockPhoto: EnhancedPhoto = {
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

const mockPhoto2: EnhancedPhoto = {
  ...mockPhoto,
  objectId: 2,
  name: "TEST_002",
  photoNo: "002",
};

const initialState = {
  query: "",
  lat: null,
  lon: null,
  radius: 2000,
  photos: [],
  total: 0,
  hasMore: false,
  isLoading: false,
  error: null,
};

describe("searchStore", () => {
  beforeEach(() => {
    useSearchStore.setState(initialState);
  });

  describe("initial state", () => {
    it("has empty query", () => {
      expect(useSearchStore.getState().query).toBe("");
    });

    it("has null lat and lon", () => {
      const { lat, lon } = useSearchStore.getState();
      expect(lat).toBeNull();
      expect(lon).toBeNull();
    });

    it("has radius 2000", () => {
      expect(useSearchStore.getState().radius).toBe(2000);
    });

    it("has empty photos array", () => {
      expect(useSearchStore.getState().photos).toEqual([]);
    });

    it("has total 0", () => {
      expect(useSearchStore.getState().total).toBe(0);
    });

    it("has hasMore false", () => {
      expect(useSearchStore.getState().hasMore).toBe(false);
    });

    it("is not loading", () => {
      expect(useSearchStore.getState().isLoading).toBe(false);
    });

    it("has no error", () => {
      expect(useSearchStore.getState().error).toBeNull();
    });
  });

  describe("setQuery", () => {
    it("updates query", () => {
      useSearchStore.getState().setQuery("Hobart");
      expect(useSearchStore.getState().query).toBe("Hobart");
    });

    it("can set query to empty string", () => {
      useSearchStore.getState().setQuery("Hobart");
      useSearchStore.getState().setQuery("");
      expect(useSearchStore.getState().query).toBe("");
    });
  });

  describe("setLocation", () => {
    it("updates lat and lon", () => {
      useSearchStore.getState().setLocation(-42.8821, 147.3272);
      const { lat, lon } = useSearchStore.getState();
      expect(lat).toBe(-42.8821);
      expect(lon).toBe(147.3272);
    });

    it("overwrites previous location", () => {
      useSearchStore.getState().setLocation(-42.0, 147.0);
      useSearchStore.getState().setLocation(-41.0, 146.0);
      const { lat, lon } = useSearchStore.getState();
      expect(lat).toBe(-41.0);
      expect(lon).toBe(146.0);
    });
  });

  describe("setRadius", () => {
    it("updates radius", () => {
      useSearchStore.getState().setRadius(5000);
      expect(useSearchStore.getState().radius).toBe(5000);
    });
  });

  describe("setPhotos", () => {
    it("sets photos, total, and hasMore", () => {
      useSearchStore.getState().setPhotos([mockPhoto], 10, true);
      const state = useSearchStore.getState();
      expect(state.photos).toEqual([mockPhoto]);
      expect(state.total).toBe(10);
      expect(state.hasMore).toBe(true);
    });

    it("clears error when setting photos", () => {
      useSearchStore.getState().setError("Some error");
      expect(useSearchStore.getState().error).toBe("Some error");

      useSearchStore.getState().setPhotos([mockPhoto], 1, false);
      expect(useSearchStore.getState().error).toBeNull();
    });

    it("replaces existing photos", () => {
      useSearchStore.getState().setPhotos([mockPhoto], 1, false);
      useSearchStore.getState().setPhotos([mockPhoto2], 1, false);
      expect(useSearchStore.getState().photos).toEqual([mockPhoto2]);
    });
  });

  describe("appendPhotos", () => {
    it("adds to existing photos", () => {
      useSearchStore.getState().setPhotos([mockPhoto], 2, true);
      useSearchStore.getState().appendPhotos([mockPhoto2]);
      expect(useSearchStore.getState().photos).toEqual([
        mockPhoto,
        mockPhoto2,
      ]);
    });

    it("appends to empty array", () => {
      useSearchStore.getState().appendPhotos([mockPhoto]);
      expect(useSearchStore.getState().photos).toEqual([mockPhoto]);
    });

    it("does not change total or hasMore", () => {
      useSearchStore.getState().setPhotos([mockPhoto], 10, true);
      useSearchStore.getState().appendPhotos([mockPhoto2]);
      expect(useSearchStore.getState().total).toBe(10);
      expect(useSearchStore.getState().hasMore).toBe(true);
    });
  });

  describe("setLoading", () => {
    it("sets isLoading to true", () => {
      useSearchStore.getState().setLoading(true);
      expect(useSearchStore.getState().isLoading).toBe(true);
    });

    it("sets isLoading to false", () => {
      useSearchStore.getState().setLoading(true);
      useSearchStore.getState().setLoading(false);
      expect(useSearchStore.getState().isLoading).toBe(false);
    });
  });

  describe("setError", () => {
    it("sets error message", () => {
      useSearchStore.getState().setError("Network error");
      expect(useSearchStore.getState().error).toBe("Network error");
    });

    it("sets isLoading to false", () => {
      useSearchStore.getState().setLoading(true);
      useSearchStore.getState().setError("Failed");
      expect(useSearchStore.getState().isLoading).toBe(false);
    });

    it("can clear error with null", () => {
      useSearchStore.getState().setError("Error");
      useSearchStore.getState().setError(null);
      expect(useSearchStore.getState().error).toBeNull();
    });
  });

  describe("reset", () => {
    it("returns to initial state", () => {
      // Mutate everything
      useSearchStore.getState().setQuery("Launceston");
      useSearchStore.getState().setLocation(-41.4332, 147.1441);
      useSearchStore.getState().setRadius(5000);
      useSearchStore.getState().setPhotos([mockPhoto, mockPhoto2], 50, true);
      useSearchStore.getState().setLoading(true);

      useSearchStore.getState().reset();

      const state = useSearchStore.getState();
      expect(state.query).toBe("");
      expect(state.lat).toBeNull();
      expect(state.lon).toBeNull();
      expect(state.radius).toBe(2000);
      expect(state.photos).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.hasMore).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});

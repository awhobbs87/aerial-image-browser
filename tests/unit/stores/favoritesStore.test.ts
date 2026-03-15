import { useFavoritesStore } from "@/stores/favoritesStore";
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

const mockPhoto3: EnhancedPhoto = {
  ...mockPhoto,
  objectId: 1,
  layerId: 1,
  name: "TEST_001_ORTHO",
  layerName: "Ortho Photos",
};

describe("favoritesStore", () => {
  beforeEach(() => {
    useFavoritesStore.setState({ favorites: [] });
  });

  describe("initial state", () => {
    it("has empty favorites array", () => {
      expect(useFavoritesStore.getState().favorites).toEqual([]);
    });
  });

  describe("addFavorite", () => {
    it("adds a photo to favorites", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      expect(useFavoritesStore.getState().favorites).toEqual([mockPhoto]);
    });

    it("adds multiple distinct photos", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      useFavoritesStore.getState().addFavorite(mockPhoto2);
      expect(useFavoritesStore.getState().favorites).toHaveLength(2);
    });

    it("does not duplicate same objectId + layerId", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      useFavoritesStore.getState().addFavorite(mockPhoto);
      expect(useFavoritesStore.getState().favorites).toHaveLength(1);
    });

    it("allows same objectId with different layerId", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      useFavoritesStore.getState().addFavorite(mockPhoto3);
      expect(useFavoritesStore.getState().favorites).toHaveLength(2);
    });
  });

  describe("removeFavorite", () => {
    it("removes by objectId and layerId", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      useFavoritesStore.getState().addFavorite(mockPhoto2);
      useFavoritesStore.getState().removeFavorite(1, 0);
      expect(useFavoritesStore.getState().favorites).toEqual([mockPhoto2]);
    });

    it("does nothing if not found", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      useFavoritesStore.getState().removeFavorite(999, 0);
      expect(useFavoritesStore.getState().favorites).toHaveLength(1);
    });

    it("only removes matching objectId + layerId combination", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      useFavoritesStore.getState().addFavorite(mockPhoto3);
      useFavoritesStore.getState().removeFavorite(1, 0);
      // mockPhoto3 has same objectId=1 but layerId=1, should remain
      expect(useFavoritesStore.getState().favorites).toEqual([mockPhoto3]);
    });
  });

  describe("isFavorite", () => {
    it("returns true for existing favorite", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      expect(useFavoritesStore.getState().isFavorite(1, 0)).toBe(true);
    });

    it("returns false for non-existing favorite", () => {
      expect(useFavoritesStore.getState().isFavorite(1, 0)).toBe(false);
    });

    it("returns false when objectId matches but layerId does not", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      expect(useFavoritesStore.getState().isFavorite(1, 1)).toBe(false);
    });

    it("returns false when layerId matches but objectId does not", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      expect(useFavoritesStore.getState().isFavorite(999, 0)).toBe(false);
    });
  });

  describe("toggleFavorite", () => {
    it("adds photo if not present", () => {
      useFavoritesStore.getState().toggleFavorite(mockPhoto);
      expect(useFavoritesStore.getState().favorites).toEqual([mockPhoto]);
    });

    it("removes photo if present", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      useFavoritesStore.getState().toggleFavorite(mockPhoto);
      expect(useFavoritesStore.getState().favorites).toEqual([]);
    });

    it("toggling twice returns to original state", () => {
      useFavoritesStore.getState().toggleFavorite(mockPhoto);
      useFavoritesStore.getState().toggleFavorite(mockPhoto);
      expect(useFavoritesStore.getState().favorites).toEqual([]);
    });

    it("only affects the specific photo", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      useFavoritesStore.getState().addFavorite(mockPhoto2);
      useFavoritesStore.getState().toggleFavorite(mockPhoto);
      expect(useFavoritesStore.getState().favorites).toEqual([mockPhoto2]);
    });
  });

  describe("clearFavorites", () => {
    it("empties the favorites array", () => {
      useFavoritesStore.getState().addFavorite(mockPhoto);
      useFavoritesStore.getState().addFavorite(mockPhoto2);
      useFavoritesStore.getState().clearFavorites();
      expect(useFavoritesStore.getState().favorites).toEqual([]);
    });

    it("works when already empty", () => {
      useFavoritesStore.getState().clearFavorites();
      expect(useFavoritesStore.getState().favorites).toEqual([]);
    });
  });
});

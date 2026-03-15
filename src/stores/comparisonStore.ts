import { create } from "zustand";
import type { EnhancedPhoto } from "../types/photo";

type CompareMode = "slider" | "side-by-side" | "then-now";

interface ComparisonState {
  mode: CompareMode;
  photoA: EnhancedPhoto | null;
  photoB: EnhancedPhoto | null;
  isSelecting: boolean;

  setMode: (mode: CompareMode) => void;
  setPhotoA: (photo: EnhancedPhoto | null) => void;
  setPhotoB: (photo: EnhancedPhoto | null) => void;
  startSelecting: () => void;
  stopSelecting: () => void;
  clear: () => void;
}

export const useComparisonStore = create<ComparisonState>((set) => ({
  mode: "slider",
  photoA: null,
  photoB: null,
  isSelecting: false,

  setMode: (mode) => set({ mode }),
  setPhotoA: (photoA) => set({ photoA }),
  setPhotoB: (photoB) => set({ photoB }),
  startSelecting: () => set({ isSelecting: true }),
  stopSelecting: () => set({ isSelecting: false }),
  clear: () => set({ photoA: null, photoB: null, isSelecting: false }),
}));

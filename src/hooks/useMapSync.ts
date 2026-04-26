import { useState, useCallback } from 'react';
import type { MapBounds } from '@/types/map';
import { useSearchStore } from '@/stores/searchStore';

/**
 * Synchronizes map viewport with search/photo state.
 * Tracks current bounds for "search this area" functionality.
 */
export function useMapSync() {
  const { lat, lon, setLocation } = useSearchStore();
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [hasMoved, setHasMoved] = useState(false);

  const handleBoundsChange = useCallback((newBounds: MapBounds) => {
    setBounds(newBounds);
    setHasMoved(true);
  }, []);

  const handleMapClick = useCallback(
    (clickLat: number, clickLon: number) => {
      setLocation(clickLat, clickLon);
      setHasMoved(false);
    },
    [setLocation],
  );

  const searchThisArea = useCallback(() => {
    if (!bounds) return;
    // Set location to center of bounds
    const centerLat = (bounds.north + bounds.south) / 2;
    const centerLon = (bounds.east + bounds.west) / 2;
    setLocation(centerLat, centerLon);
    setHasMoved(false);
  }, [bounds, setLocation]);

  const center: [number, number] | undefined =
    lat !== null && lon !== null ? [lon, lat] : undefined;

  return {
    bounds,
    hasMoved,
    center,
    handleBoundsChange,
    handleMapClick,
    searchThisArea,
  };
}

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

interface PinDropProps {
  map: maplibregl.Map | null;
  lat: number | null;
  lon: number | null;
}

export function PinDrop({ map, lat, lon }: PinDropProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }

    // Add new marker if we have coordinates
    if (lat !== null && lon !== null) {
      const marker = new maplibregl.Marker({ color: '#2ac56a' })
        .setLngLat([lon, lat])
        .addTo(map);
      markerRef.current = marker;
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, lat, lon]);

  return null;
}

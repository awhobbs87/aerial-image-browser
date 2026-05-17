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

    markerRef.current?.remove();
    markerRef.current = null;

    if (lat !== null && lon !== null) {
      markerRef.current = new maplibregl.Marker({ color: '#0ea5e9', scale: 0.85 })
        .setLngLat([lon, lat])
        .addTo(map);
    }

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [map, lat, lon]);

  return null;
}

import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { TASMANIA_DEFAULT_VIEWPORT } from '@/types/map';
import type { MapBounds } from '@/types/map';
import classes from './MapView.module.css';

interface MapViewProps {
  onBoundsChange?: (bounds: MapBounds) => void;
  onClick?: (lat: number, lon: number) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

export function MapView({ onBoundsChange, onClick, center, zoom, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: center || TASMANIA_DEFAULT_VIEWPORT.center,
      zoom: zoom ?? TASMANIA_DEFAULT_VIEWPORT.zoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

    map.on('moveend', () => {
      const bounds = map.getBounds();
      onBoundsChange?.({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest(),
      });
    });

    map.on('click', (e) => {
      onClick?.(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center/zoom when props change
  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.flyTo({ center, zoom: zoom ?? mapRef.current.getZoom() });
  }, [center?.[0], center?.[1], zoom]);

  return (
    <div
      ref={containerRef}
      className={`${classes.container} ${className || ''}`}
    />
  );
}

// Export a method to get the map instance (for advanced usage)
export function useMapInstance() {
  // This is a simple ref-based approach; could be enhanced with context
  return null;
}

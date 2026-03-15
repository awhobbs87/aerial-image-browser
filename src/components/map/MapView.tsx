import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconCurrentLocation } from '@tabler/icons-react';
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

/** Dark-mode aware tile URLs */
const LIGHT_TILES = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png';
const DARK_TILES = 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}@2x.png';

function prefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function MapView({ onBoundsChange, onClick, center, zoom, className }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [locating, setLocating] = useState(false);

  // Create or move the click marker
  const showMarker = useCallback((lngLat: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLngLat(lngLat);
    } else {
      const el = document.createElement('div');
      el.className = 'map-pin-marker';
      // Add the pulse ring child
      const pulse = document.createElement('div');
      pulse.className = 'map-pin-pulse';
      el.appendChild(pulse);
      markerRef.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
    }

    // Restart animations
    const el = markerRef.current.getElement();
    el.classList.remove('map-pin-animate');
    void el.offsetWidth;
    el.classList.add('map-pin-animate');
  }, []);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const isDark = prefersDark();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          'carto-tiles': {
            type: 'raster',
            tiles: [isDark ? DARK_TILES : LIGHT_TILES],
            tileSize: 256,
            attribution:
              '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://stadiamaps.com">Stadia</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
          },
        },
        layers: [
          {
            id: 'carto-tiles',
            type: 'raster',
            source: 'carto-tiles',
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
      center: center || TASMANIA_DEFAULT_VIEWPORT.center,
      zoom: zoom ?? TASMANIA_DEFAULT_VIEWPORT.zoom,
      attributionControl: false,
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

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
      const lngLat: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      showMarker(lngLat);
      onClick?.(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;

    // Listen for color scheme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSchemeChange = (e: MediaQueryListEvent) => {
      const tiles = e.matches ? DARK_TILES : LIGHT_TILES;
      const source = map.getSource('carto-tiles') as maplibregl.RasterTileSource | undefined;
      if (source) {
        // MapLibre doesn't support setTiles directly, so reload the style
        map.setStyle({
          version: 8,
          sources: {
            'carto-tiles': {
              type: 'raster',
              tiles: [tiles],
              tileSize: 256,
              attribution:
                '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
            },
          },
          layers: [
            {
              id: 'carto-tiles',
              type: 'raster',
              source: 'carto-tiles',
              minzoom: 0,
              maxzoom: 20,
            },
          ],
        });
      }
    };
    mq.addEventListener('change', handleSchemeChange);

    return () => {
      mq.removeEventListener('change', handleSchemeChange);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fly to center when props change
  const centerLng = center?.[0];
  const centerLat = center?.[1];
  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.flyTo({ center, zoom: zoom ?? mapRef.current.getZoom() });
    showMarker(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLng, centerLat, zoom, showMarker]);

  // Locate me handler
  const handleLocateMe = useCallback(() => {
    if (!('geolocation' in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const lngLat: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        mapRef.current?.flyTo({ center: lngLat, zoom: 14 });
        showMarker(lngLat);
        onClick?.(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [onClick, showMarker]);

  return (
    <div className={`${classes.container} ${className || ''}`}>
      <div
        ref={containerRef}
        className={classes.mapCanvas}
        role="application"
        aria-label="Interactive map"
      />

      {/* Locate me button */}
      <div className={classes.locateBtn}>
        <Tooltip label="My location" position="left" withArrow>
          <ActionIcon
            variant="default"
            size="lg"
            radius="md"
            onClick={handleLocateMe}
            loading={locating}
            aria-label="My location"
            className={classes.controlBtn}
          >
            <IconCurrentLocation size={18} />
          </ActionIcon>
        </Tooltip>
      </div>
    </div>
  );
}

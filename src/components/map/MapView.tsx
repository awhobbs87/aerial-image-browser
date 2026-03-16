import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconCurrentLocation, IconMap, IconSatellite } from '@tabler/icons-react';
import { TASMANIA_DEFAULT_VIEWPORT } from '@/types/map';
import type { MapBounds } from '@/types/map';
import classes from './MapView.module.css';

interface MapViewProps {
  onBoundsChange?: (bounds: MapBounds) => void;
  onClick?: (lat: number, lon: number) => void;
  onMapReady?: (map: maplibregl.Map) => void;
  center?: [number, number];
  zoom?: number;
  className?: string;
}

/** Tile URLs */
const LIGHT_TILES = 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png';
const DARK_TILES = 'https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}@2x.png';
const SATELLITE_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

function prefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function buildStyle(tileUrl: string, attribution: string): maplibregl.StyleSpecification {
  return {
    version: 8,
    sources: {
      'base-tiles': {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        attribution,
      },
    },
    layers: [
      {
        id: 'base-tiles',
        type: 'raster',
        source: 'base-tiles',
        minzoom: 0,
        maxzoom: 20,
      },
    ],
  };
}

const CARTO_ATTR =
  '&copy; <a href="https://carto.com">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';
const SAT_ATTR = '&copy; <a href="https://www.esri.com">Esri</a> World Imagery';

export function MapView({
  onBoundsChange,
  onClick,
  onMapReady,
  center,
  zoom,
  className,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [locating, setLocating] = useState(false);
  const [satellite, setSatellite] = useState(true);

  // Create or move the click marker
  const showMarker = useCallback((lngLat: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLngLat(lngLat);
    } else {
      markerRef.current = new maplibregl.Marker({ color: '#2ac56a', scale: 0.85 })
        .setLngLat(lngLat)
        .addTo(map);
    }
  }, []);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: buildStyle(SATELLITE_TILES, SAT_ATTR),
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
    map.once('load', () => onMapReady?.(map));

    // Listen for color scheme changes (only affects map mode, not satellite)
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSchemeChange = (e: MediaQueryListEvent) => {
      // Only swap if we're in map mode (not satellite)
      if (!satellite) {
        const tiles = e.matches ? DARK_TILES : LIGHT_TILES;
        map.setStyle(buildStyle(tiles, CARTO_ATTR));
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

  // Toggle satellite/map style
  const handleToggleSatellite = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const newSat = !satellite;
    setSatellite(newSat);

    if (newSat) {
      map.setStyle(buildStyle(SATELLITE_TILES, SAT_ATTR));
    } else {
      const isDark = prefersDark();
      map.setStyle(buildStyle(isDark ? DARK_TILES : LIGHT_TILES, CARTO_ATTR));
    }

    // Re-add marker after style change (setStyle removes all layers/sources)
    map.once('style.load', () => {
      if (markerRef.current) {
        const lngLat = markerRef.current.getLngLat();
        markerRef.current.remove();
        markerRef.current = new maplibregl.Marker({ color: '#2ac56a', scale: 0.85 })
          .setLngLat(lngLat)
          .addTo(map);
      }
      // Re-fire mapReady so PhotoFootprints re-adds its layers
      onMapReady?.(map);
    });
  }, [satellite, onMapReady]);

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

      {/* Map controls — bottom right stack */}
      <div className={classes.controls}>
        <Tooltip label={satellite ? 'Map view' : 'Satellite view'} position="left" withArrow>
          <ActionIcon
            variant="default"
            size="lg"
            radius="md"
            onClick={handleToggleSatellite}
            aria-label={satellite ? 'Switch to map view' : 'Switch to satellite view'}
            className={classes.controlBtn}
          >
            {satellite ? <IconMap size={18} /> : <IconSatellite size={18} />}
          </ActionIcon>
        </Tooltip>
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

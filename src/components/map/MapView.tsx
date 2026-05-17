import { useEffect, useRef, useCallback, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { IconCurrentLocation, IconMap, IconSatellite } from '@tabler/icons-react';
import { TASMANIA_DEFAULT_VIEWPORT } from '@/types/map';
import type { MapBounds } from '@/types/map';
import { isResolvedDark, subscribeToResolvedTheme } from '@/lib/theme';
import { Tooltip } from '@/components/ui/Tooltip';

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
  const satelliteRef = useRef(true);
  const [locating, setLocating] = useState(false);
  const [satellite, setSatellite] = useState(true);

  satelliteRef.current = satellite;

  const showMarker = useCallback((lngLat: [number, number]) => {
    const map = mapRef.current;
    if (!map) return;

    if (markerRef.current) {
      markerRef.current.setLngLat(lngLat);
    } else {
      markerRef.current = new maplibregl.Marker({ color: '#0ea5e9', scale: 0.85 })
        .setLngLat(lngLat)
        .addTo(map);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: buildStyle(SATELLITE_TILES, SAT_ATTR),
      center: center || TASMANIA_DEFAULT_VIEWPORT.center,
      zoom: zoom ?? TASMANIA_DEFAULT_VIEWPORT.zoom,
      attributionControl: false,
      dragPan: true,
      dragRotate: true,
      touchZoomRotate: true,
      touchPitch: true,
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

    const resize = () => map.resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    map.once('load', () => {
      resize();
      onMapReady?.(map);
    });

    const handleThemeChange = () => {
      if (satelliteRef.current) return;
      const tiles = isResolvedDark() ? DARK_TILES : LIGHT_TILES;
      map.setStyle(buildStyle(tiles, CARTO_ATTR));
    };

    const unsubTheme = subscribeToResolvedTheme(handleThemeChange);

    return () => {
      unsubTheme();
      resizeObserver.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const centerLng = center?.[0];
  const centerLat = center?.[1];
  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.flyTo({ center, zoom: zoom ?? mapRef.current.getZoom() });
    showMarker(center);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centerLng, centerLat, zoom, showMarker]);

  const handleToggleSatellite = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    const newSat = !satellite;
    setSatellite(newSat);

    if (newSat) {
      map.setStyle(buildStyle(SATELLITE_TILES, SAT_ATTR));
    } else {
      map.setStyle(buildStyle(isResolvedDark() ? DARK_TILES : LIGHT_TILES, CARTO_ATTR));
    }

    map.once('style.load', () => {
      if (markerRef.current) {
        const lngLat = markerRef.current.getLngLat();
        markerRef.current.remove();
        markerRef.current = new maplibregl.Marker({ color: '#0ea5e9', scale: 0.85 })
          .setLngLat(lngLat)
          .addTo(map);
      }
      onMapReady?.(map);
    });
  }, [satellite, onMapReady]);

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
    <div className={`relative h-full min-h-[300px] w-full overflow-hidden ${className || ''}`}>
      <div
        ref={containerRef}
        className="h-full w-full touch-none overscroll-none [&_canvas]:outline-none"
        role="application"
        aria-label="Interactive map"
      />

      <div className="absolute right-2.5 bottom-10 z-2 flex flex-col gap-1.5">
        <Tooltip label={satellite ? 'Map view' : 'Satellite view'} side="left">
          <button
            type="button"
            onClick={handleToggleSatellite}
            aria-label={satellite ? 'Switch to map view' : 'Switch to satellite view'}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-950/10 bg-white/90 text-slate-700 shadow-md backdrop-blur-md transition duration-100 hover:bg-white hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-white/10 dark:bg-slate-950/85 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {satellite ? <IconMap size={18} /> : <IconSatellite size={18} />}
          </button>
        </Tooltip>
        <Tooltip label="My location" side="left">
          <button
            type="button"
            onClick={handleLocateMe}
            disabled={locating}
            aria-label="My location"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-950/10 bg-white/90 text-slate-700 shadow-md backdrop-blur-md transition duration-100 hover:bg-white hover:text-slate-950 disabled:cursor-wait disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:border-white/10 dark:bg-slate-950/85 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            {locating ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600" />
            ) : (
              <IconCurrentLocation size={18} />
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

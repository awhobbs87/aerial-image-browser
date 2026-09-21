import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type maplibregl from 'maplibre-gl';
import { MapView } from '@/components/map/MapView';
import type { EnhancedPhoto } from '@/types/photo';
import { formatScale } from '@/lib/format';
export interface SearchReference {
  lat: number;
  lon: number;
  label: string;
}
export function LocationReference({
  layerId,
  imageName,
  reference,
}: {
  layerId: number;
  imageName: string;
  reference?: SearchReference;
}) {
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [footprintReady, setFootprintReady] = useState(false);
  const { data, isLoading, error } = useQuery<EnhancedPhoto>({
    queryKey: ['photo-metadata', layerId, imageName],
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `/api/images/metadata/${layerId}/${encodeURIComponent(imageName)}`,
        { signal },
      );
      if (!response.ok) throw new Error('Survey footprint unavailable');
      return response.json();
    },
  });
  const draw = useCallback(
    (instance: maplibregl.Map) => {
      if (!data?.rings.length || instance.getSource('reference-footprint')) return;
      instance.addSource('reference-footprint', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Polygon', coordinates: data.rings },
        },
      });
      instance.addLayer({
        id: 'reference-fill',
        source: 'reference-footprint',
        type: 'fill',
        paint: { 'fill-color': '#f59e0b', 'fill-opacity': 0.12 },
      });
      instance.addLayer({
        id: 'reference-line',
        source: 'reference-footprint',
        type: 'line',
        paint: { 'line-color': '#f59e0b', 'line-width': 2 },
      });
      setFootprintReady(true);
      const points = data.rings.flat();
      const xs = points.map((p) => p[0]),
        ys = points.map((p) => p[1]);
      instance.fitBounds(
        [
          [Math.min(...xs), Math.min(...ys)],
          [Math.max(...xs), Math.max(...ys)],
        ],
        { padding: 35, duration: 0, maxZoom: 16 },
      );
    },
    [data],
  );
  useEffect(() => {
    if (!map) return;
    const update = () => draw(map);
    if (map.isStyleLoaded()) update();
    map.on('style.load', update);
    return () => {
      map.off('style.load', update);
    };
  }, [map, draw]);
  return (
    <div className="flex flex-col gap-3 p-4">
      <p className="text-sm font-semibold">{reference?.label || 'Survey location'}</p>
      <div className="h-[min(40dvh,360px)] min-h-52 overflow-hidden rounded-xl">
        <MapView
          center={reference ? [reference.lon, reference.lat] : undefined}
          zoom={15}
          onMapReady={setMap}
          readOnly
        />
      </div>
      {isLoading && <p role="status">Loading survey footprint…</p>}
      {footprintReady && (
        <span className="sr-only" role="status">
          Survey footprint shown
        </span>
      )}
      {error && (
        <p role="alert">
          Survey footprint unavailable.{' '}
          {reference ? 'The address marker still shows your search location.' : 'Try again later.'}
        </p>
      )}
      {data && (
        <p className="text-sm text-muted-foreground">
          {data.year || 'Date unknown'} · {formatScale(data.scale)} · {data.layerName}
        </p>
      )}
      <p className="text-xs leading-5 text-muted-foreground">
        {reference ? 'Blue marks your searched location. ' : ''} Orange outlines the survey
        footprint. Historical scans may be rotated or distorted; the footprint and scale alone
        cannot place an accurate address pin on the photograph.
      </p>
    </div>
  );
}

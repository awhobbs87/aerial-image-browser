import { useEffect, useEffectEvent, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { FeatureCollection } from 'geojson';
import type maplibregl from 'maplibre-gl';
import type { EnhancedPhoto } from '@/types/photo';
import { useUIStore } from '@/stores/uiStore';

interface PhotoFootprintsProps {
  map: maplibregl.Map | null;
  photos: EnhancedPhoto[];
  onPhotoClick?: (photo: EnhancedPhoto) => void;
}
const SOURCE_ID = 'photo-footprints';
const FILL_ID = 'photo-footprints-hover-fill';
const LINE_ID = 'photo-footprints-hover-line';
const photoId = (photo: EnhancedPhoto) => `${photo.layerId}:${photo.objectId}`;

export function PhotoFootprints({ map, photos, onPhotoClick }: PhotoFootprintsProps) {
  const { hoveredPhotoId, hoveredPhotoLayerId } = useUIStore(
    useShallow((s) => ({
      hoveredPhotoId: s.hoveredPhotoId,
      hoveredPhotoLayerId: s.hoveredPhotoLayerId,
    })),
  );
  const geojson = useMemo<FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: photos
        .filter((p) => p.rings?.length)
        .map((p) => ({
          type: 'Feature',
          id: photoId(p),
          properties: { photoId: photoId(p) },
          geometry: { type: 'Polygon', coordinates: p.rings },
        })),
    }),
    [photos],
  );
  const lookup = useMemo(() => new Map(photos.map((p) => [photoId(p), p])), [photos]);

  const restoreHover = useEffectEvent(() => {
    if (!map?.getSource(SOURCE_ID) || hoveredPhotoId === null || hoveredPhotoLayerId === null)
      return;
    map.setFeatureState(
      { source: SOURCE_ID, id: `${hoveredPhotoLayerId}:${hoveredPhotoId}` },
      { hover: true },
    );
  });
  const handleClick = useEffectEvent(
    (event: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      const photo = lookup.get(String(event.features?.[0]?.properties?.photoId));
      if (photo) onPhotoClick?.(photo);
    },
  );

  useEffect(() => {
    if (!map) return;
    const sync = () => {
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(geojson);
      else {
        map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });
        map.addLayer({
          id: FILL_ID,
          type: 'fill',
          source: SOURCE_ID,
          paint: {
            'fill-color': '#0ea5e9',
            'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.15, 0],
          },
        });
        map.addLayer({
          id: LINE_ID,
          type: 'line',
          source: SOURCE_ID,
          paint: {
            'line-color': '#0ea5e9',
            'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.5, 0],
            'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0],
          },
        });
      }
      restoreHover();
    };
    if (map.getSource(SOURCE_ID) || map.isStyleLoaded()) sync();
    else map.once('idle', sync);
    map.on('style.load', sync);
    return () => {
      map.off('style.load', sync);
      map.off('idle', sync);
    };
  }, [map, geojson]);

  useEffect(() => {
    if (!map) return;
    const click = (
      event: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] },
    ) => handleClick(event);
    const enter = () => {
      map.getCanvas().style.cursor = 'pointer';
    };
    const leave = () => {
      map.getCanvas().style.cursor = '';
    };
    map.on('click', FILL_ID, click);
    map.on('mouseenter', FILL_ID, enter);
    map.on('mouseleave', FILL_ID, leave);
    return () => {
      map.off('click', FILL_ID, click);
      map.off('mouseenter', FILL_ID, enter);
      map.off('mouseleave', FILL_ID, leave);
    };
  }, [map]);

  useEffect(() => {
    if (!map?.getSource(SOURCE_ID) || hoveredPhotoId === null || hoveredPhotoLayerId === null)
      return;
    const target = { source: SOURCE_ID, id: `${hoveredPhotoLayerId}:${hoveredPhotoId}` };
    map.setFeatureState(target, { hover: true });
    return () => {
      if (map.getSource(SOURCE_ID)) map.setFeatureState(target, { hover: false });
    };
  }, [map, hoveredPhotoId, hoveredPhotoLayerId]);
  return null;
}

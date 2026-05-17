import { useEffect, useRef } from 'react';
import type maplibregl from 'maplibre-gl';
import type { EnhancedPhoto } from '@/types/photo';

interface PhotoFootprintsProps {
  map: maplibregl.Map | null;
  photos: EnhancedPhoto[];
  hoveredPhotoId: number | null;
  onPhotoClick?: (photo: EnhancedPhoto) => void;
}

const SOURCE_ID = 'photo-footprints';
const HOVER_FILL_ID = 'photo-footprints-hover-fill';
const HOVER_LINE_ID = 'photo-footprints-hover-line';

export function PhotoFootprints({
  map,
  photos,
  hoveredPhotoId,
  onPhotoClick,
}: PhotoFootprintsProps) {
  const prevHoveredId = useRef<number | null>(null);
  const layersAdded = useRef(false);

  // Sync GeoJSON source data whenever photos change
  useEffect(() => {
    if (!map) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: photos
        .filter((p) => p.rings && p.rings.length > 0)
        .map((photo) => ({
          type: 'Feature' as const,
          id: photo.objectId,
          properties: {
            objectId: photo.objectId,
            layerId: photo.layerId,
            name: photo.name,
          },
          geometry: {
            type: 'Polygon' as const,
            coordinates: photo.rings,
          },
        })),
    };

    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
      return;
    }

    // First time: create source + layers
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: geojson,
      promoteId: 'objectId',
    });

    // Hover fill — completely invisible by default (feature-state driven)
    map.addLayer({
      id: HOVER_FILL_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': '#0ea5e9',
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.15,
          0, // invisible unless hovered
        ],
      },
    });

    // Hover outline — only visible on hovered feature
    map.addLayer({
      id: HOVER_LINE_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#0ea5e9',
        'line-width': ['case', ['boolean', ['feature-state', 'hover'], false], 2.5, 0],
        'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.9, 0],
      },
    });

    layersAdded.current = true;

    // Click handler on fill
    const handleClick = (
      e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] },
    ) => {
      const feat = e.features?.[0];
      if (!feat) return;
      const objectId = feat.properties?.objectId as number;
      const photo = photos.find((p) => p.objectId === objectId);
      if (photo) onPhotoClick?.(photo);
    };

    map.on('click', HOVER_FILL_ID, handleClick);
    map.on('mouseenter', HOVER_FILL_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', HOVER_FILL_ID, () => {
      map.getCanvas().style.cursor = '';
    });
  }, [map, photos, onPhotoClick]);

  // Drive feature-state hover on/off
  useEffect(() => {
    if (!map || !map.getSource(SOURCE_ID)) return;

    // Clear previous
    if (prevHoveredId.current !== null) {
      try {
        map.setFeatureState({ source: SOURCE_ID, id: prevHoveredId.current }, { hover: false });
      } catch {
        /* feature may no longer exist */
      }
    }

    // Set new
    if (hoveredPhotoId !== null) {
      try {
        map.setFeatureState({ source: SOURCE_ID, id: hoveredPhotoId }, { hover: true });
      } catch {
        /* feature may not exist yet */
      }
    }

    prevHoveredId.current = hoveredPhotoId;
  }, [map, hoveredPhotoId]);

  return null;
}

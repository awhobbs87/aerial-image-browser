import { useEffect } from 'react';
import type maplibregl from 'maplibre-gl';
import type { EnhancedPhoto } from '@/types/photo';

interface PhotoFootprintsProps {
  map: maplibregl.Map | null;
  photos: EnhancedPhoto[];
  onPhotoClick?: (photo: EnhancedPhoto) => void;
}

const SOURCE_ID = 'photo-footprints';
const FILL_LAYER_ID = 'photo-footprints-fill';
const OUTLINE_LAYER_ID = 'photo-footprints-outline';

export function PhotoFootprints({ map, photos, onPhotoClick }: PhotoFootprintsProps) {
  useEffect(() => {
    if (!map) return;

    // Build GeoJSON FeatureCollection from photos with ring geometry
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: photos
        .filter((p) => p.rings && p.rings.length > 0)
        .map((photo) => ({
          type: 'Feature',
          properties: {
            objectId: photo.objectId,
            layerId: photo.layerId,
            name: photo.name,
            year: photo.year,
            scale: photo.scale,
          },
          geometry: {
            type: 'Polygon',
            coordinates: photo.rings,
          },
        })),
    };

    // Add or update source
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
    if (source) {
      source.setData(geojson);
    } else {
      map.addSource(SOURCE_ID, { type: 'geojson', data: geojson });

      map.addLayer({
        id: FILL_LAYER_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': '#2ac56a',
          'fill-opacity': 0.15,
        },
      });

      map.addLayer({
        id: OUTLINE_LAYER_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': '#2ac56a',
          'line-width': 2,
          'line-opacity': 0.6,
        },
      });
    }

    // Click handler
    const handleClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
      if (e.features && e.features.length > 0) {
        const feature = e.features[0];
        const objectId = feature.properties?.objectId;
        const photo = photos.find((p) => p.objectId === objectId);
        if (photo) onPhotoClick?.(photo);
      }
    };

    map.on('click', FILL_LAYER_ID, handleClick);

    // Hover cursor
    map.on('mouseenter', FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', FILL_LAYER_ID, () => {
      map.getCanvas().style.cursor = '';
    });

    return () => {
      map.off('click', FILL_LAYER_ID, handleClick);
      // Don't remove source/layers on unmount -- let map cleanup handle it
    };
  }, [map, photos, onPhotoClick]);

  return null; // Render-less component, just manages map layers
}

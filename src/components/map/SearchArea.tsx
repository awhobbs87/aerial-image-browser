import { useEffect, useState } from 'react';
import type { Map } from 'maplibre-gl';
import { Button } from '@cloudflare/kumo/components/button';
import { useSearchStore } from '@/stores/searchStore';
import { searchableBounds } from '@/lib/search-extent';
export function SearchArea({ map }: { map: Map | null }) {
  const bounds = useSearchStore((s) => s.bounds);
  const setBounds = useSearchStore((s) => s.setBounds);
  const [canSearch, setCanSearch] = useState(false);
  useEffect(() => {
    if (!map) return;
    const update = () => {
      const b = map.getBounds();
      setCanSearch(
        searchableBounds({
          west: b.getWest(),
          east: b.getEast(),
          south: b.getSouth(),
          north: b.getNorth(),
        }),
      );
    };
    update();
    map.on('moveend', update);
    return () => {
      map.off('moveend', update);
    };
  }, [map]);
  useEffect(() => {
    if (!map) return;
    const draw = () => {
      if (!map.isStyleLoaded()) return;
      if (map.getLayer('search-area-line')) map.removeLayer('search-area-line');
      if (map.getSource('search-area')) map.removeSource('search-area');
      if (!bounds) return;
      map.addSource('search-area', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [bounds.west, bounds.south],
                [bounds.east, bounds.south],
                [bounds.east, bounds.north],
                [bounds.west, bounds.north],
                [bounds.west, bounds.south],
              ],
            ],
          },
        },
      });
      map.addLayer({
        id: 'search-area-line',
        source: 'search-area',
        type: 'line',
        paint: { 'line-color': '#38bdf8', 'line-width': 3, 'line-dasharray': [3, 2] },
      });
    };
    draw();
    map.on('style.load', draw);
    return () => {
      map.off('style.load', draw);
    };
  }, [map, bounds]);
  return (
    <div className="absolute right-3 bottom-9 z-10 max-w-60 rounded-xl bg-background/95 p-2 shadow-lg">
      <Button
        disabled={!map || !canSearch}
        onClick={() => {
          if (!map) return;
          const b = map.getBounds();
          setBounds({
            west: b.getWest(),
            east: b.getEast(),
            south: b.getSouth(),
            north: b.getNorth(),
          });
        }}
      >
        Search visible area
      </Button>
      {!canSearch && (
        <p className="mt-1 text-xs text-muted-foreground">
          Zoom in to search an area under roughly 20 km across.
        </p>
      )}
    </div>
  );
}

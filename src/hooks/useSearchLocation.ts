import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSearchStore } from '@/stores/searchStore';
import { isTasmaniaLocation } from '@/lib/tasmania-geocoder';
const KEY = 'tas-aerial-active-location';
export function useSearchLocation() {
  const { lat, lon, query, setLocation, setQuery } = useSearchStore(
    useShallow(({ lat, lon, query, setLocation, setQuery }) => ({
      lat,
      lon,
      query,
      setLocation,
      setQuery,
    })),
  );
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const params = new URLSearchParams(window.location.search);
      let location: { lat: number; lon: number; query: string } | null = null;
      if (params.has('lat') && params.has('lon'))
        location = {
          lat: Number(params.get('lat')),
          lon: Number(params.get('lon')),
          query: params.get('q') || '',
        };
      else if (useSearchStore.getState().lat === null) {
        try {
          location = JSON.parse(sessionStorage.getItem(KEY) || 'null');
        } catch {
          /* Private browsing. */
        }
      }
      if (location && isTasmaniaLocation(location.lat, location.lon)) {
        setLocation(location.lat, location.lon);
        setQuery(typeof location.query === 'string' ? location.query : '');
      }
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, [setLocation, setQuery]);
  useEffect(() => {
    if (!ready || lat === null || lon === null || !isTasmaniaLocation(lat, lon)) return;
    const params = new URLSearchParams({ lat: String(lat), lon: String(lon) });
    if (query) params.set('q', query);
    const url = `${window.location.pathname}?${params}`;
    if (url !== window.location.pathname + window.location.search)
      window.history.replaceState(window.history.state, '', url);
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ lat, lon, query }));
    } catch {
      /* Private browsing. */
    }
  }, [ready, lat, lon, query]);
  return ready;
}

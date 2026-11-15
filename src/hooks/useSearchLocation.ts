import {
  validBounds,
  searchableBounds,
  readExtentParams,
  writeExtentParams,
} from '@/lib/search-extent';
import type { MapBounds } from '@/types/map';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSearchStore } from '@/stores/searchStore';
import { isTasmaniaLocation } from '@/lib/tasmania-geocoder';
const KEY = 'tas-aerial-active-location';
export function useSearchLocation() {
  const { lat, lon, query, bounds, frameBounds, setLocation, setQuery } = useSearchStore(
    useShallow(({ lat, lon, query, bounds, frameBounds, setLocation, setQuery }) => ({
      lat,
      lon,
      query,
      bounds,
      frameBounds,
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
      let location: {
        lat: number;
        lon: number;
        query: string;
        bounds?: MapBounds;
        frameBounds?: MapBounds;
      } | null = null;
      if (params.has('lat') && params.has('lon'))
        location = {
          lat: Number(params.get('lat')),
          lon: Number(params.get('lon')),
          query: params.get('q') || '',
          bounds: readExtentParams(params, 'bounds'),
          frameBounds: readExtentParams(params, 'frame'),
        };
      else if (useSearchStore.getState().lat === null) {
        try {
          location = JSON.parse(sessionStorage.getItem(KEY) || 'null');
        } catch {
          /* Private browsing. */
        }
      }
      if (location && isTasmaniaLocation(location.lat, location.lon)) {
        const current = useSearchStore.getState();
        const frame =
          location.frameBounds ||
          (current.lat === location.lat && current.lon === location.lon
            ? current.frameBounds
            : null);
        setLocation(location.lat, location.lon);
        if (location.bounds && searchableBounds(location.bounds))
          current.setBounds(location.bounds);
        if (validBounds(frame)) current.setFrameBounds(frame);
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
    if (bounds) writeExtentParams(params, 'bounds', bounds);
    if (frameBounds) writeExtentParams(params, 'frame', frameBounds);
    const url = `${window.location.pathname}?${params}`;
    if (url !== window.location.pathname + window.location.search)
      window.history.replaceState(window.history.state, '', url);
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ lat, lon, query, bounds, frameBounds }));
    } catch {
      /* Private browsing. */
    }
  }, [ready, lat, lon, query, bounds, frameBounds]);
  return ready;
}

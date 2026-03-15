import { useEffect, useCallback } from 'react';
import { useSearchStore } from '@/stores/searchStore';
import { useFilterStore } from '@/stores/filterStore';

/**
 * Syncs Zustand search/filter state with URL query parameters.
 * Enables deep-linking: /search?lat=-42.88&lon=147.33&q=Hobart&layers=0,1
 */
export function useSearchState() {
  const { query, lat, lon, setQuery, setLocation } = useSearchStore();
  const { layers, startYear, endYear, setLayers, setDateRange } = useFilterStore();

  // Read URL params on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    const urlLat = params.get('lat');
    const urlLon = params.get('lon');
    const urlQuery = params.get('q');
    const urlLayers = params.get('layers');
    const urlStartYear = params.get('startYear');
    const urlEndYear = params.get('endYear');

    if (urlLat && urlLon) {
      const parsedLat = parseFloat(urlLat);
      const parsedLon = parseFloat(urlLon);
      if (!isNaN(parsedLat) && !isNaN(parsedLon)) {
        setLocation(parsedLat, parsedLon);
      }
    }

    if (urlQuery) {
      setQuery(urlQuery);
    }

    if (urlLayers) {
      const parsed = urlLayers
        .split(',')
        .map(Number)
        .filter((n) => !isNaN(n));
      if (parsed.length > 0) setLayers(parsed);
    }

    if (urlStartYear || urlEndYear) {
      setDateRange(
        urlStartYear ? parseInt(urlStartYear) : null,
        urlEndYear ? parseInt(urlEndYear) : null,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Write state to URL params
  const syncToUrl = useCallback(() => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();

    if (query) params.set('q', query);
    if (lat !== null) params.set('lat', lat.toFixed(4));
    if (lon !== null) params.set('lon', lon.toFixed(4));
    if (layers.length > 0 && layers.length < 3) params.set('layers', layers.join(','));
    if (startYear) params.set('startYear', String(startYear));
    if (endYear) params.set('endYear', String(endYear));

    const search = params.toString();
    const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;

    window.history.replaceState(null, '', newUrl);
  }, [query, lat, lon, layers, startYear, endYear]);

  // Sync to URL whenever state changes
  useEffect(() => {
    syncToUrl();
  }, [syncToUrl]);

  return { syncToUrl };
}

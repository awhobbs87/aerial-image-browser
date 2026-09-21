import { navigate } from 'astro:transitions/client';
import { useCallback } from 'react';
import { SearchBar } from './SearchBar';

/**
 * Landing page wrapper for SearchBar that navigates to /search on location select.
 * Exists because Astro island serialization cannot pass function props across the
 * server/client boundary, so the redirect callback must live in a client component.
 */
export function LandingSearchBar() {
  const handleLocationSelect = useCallback((lat: number, lon: number, label: string) => {
    void navigate(
      `/search?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&q=${encodeURIComponent(label)}`,
    );
  }, []);

  return <SearchBar size="lg" onLocationSelect={handleLocationSelect} />;
}

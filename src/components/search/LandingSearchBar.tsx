import { useCallback, useEffect } from 'react';
import { SearchBar } from './SearchBar';
import { useUIStore } from '@/stores/uiStore';

/**
 * Landing page wrapper for SearchBar that navigates to /search on location select.
 * Exists because Astro island serialization cannot pass function props across the
 * server/client boundary, so the redirect callback must live in a client component.
 */
export function LandingSearchBar() {
  const searchFocused = useUIStore((state) => state.searchFocused);

  const handleLocationSelect = useCallback((lat: number, lon: number, label: string) => {
    window.location.href = `/search?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&q=${encodeURIComponent(label)}`;
  }, []);

  useEffect(() => {
    if (!searchFocused || !window.matchMedia('(max-width: 47.99em)').matches) return undefined;

    const pinToTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    pinToTop();
    window.addEventListener('scroll', pinToTop, { passive: true });
    window.visualViewport?.addEventListener('resize', pinToTop);
    window.visualViewport?.addEventListener('scroll', pinToTop);

    return () => {
      window.removeEventListener('scroll', pinToTop);
      window.visualViewport?.removeEventListener('resize', pinToTop);
      window.visualViewport?.removeEventListener('scroll', pinToTop);
      pinToTop();
    };
  }, [searchFocused]);

  return <SearchBar size="lg" onLocationSelect={handleLocationSelect} />;
}

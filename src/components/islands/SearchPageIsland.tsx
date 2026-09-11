import { Suspense, lazy, useEffect, useState, useMemo, useCallback } from 'react';
import { IconAdjustments, IconSparkles } from '@tabler/icons-react';
import type maplibregl from 'maplibre-gl';
import { SearchBar } from '../search/SearchBar';
import { SearchResults } from '../search/SearchResults';
import { MapView } from '../map/MapView';
import { PhotoFootprints } from '../map/PhotoFootprints';
import { FilterPanel } from '../filters/FilterPanel';
import { MobileFilterSheet } from '../filters/MobileFilterSheet';
import { AppProviders } from '../common/AppProviders';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useSearchStore } from '@/stores/searchStore';
import { useUIStore } from '@/stores/uiStore';
import { usePhotos } from '@/hooks/usePhotos';
import type { EnhancedPhoto } from '@/types/photo';
import type { MapBounds } from '@/types/map';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';

const PhotoPreviewModal = lazy(async () => {
  const module = await import('../photos/PhotoPreviewModal');
  return { default: module.PhotoPreviewModal };
});
const AISearchModal = lazy(async () => {
  const module = await import('../search/AISearchModal');
  return { default: module.AISearchModal };
});

function SearchPageContent() {
  const { lat, lon, query, setLocation, setQuery } = useSearchStore();
  const { filterPanelOpen, setFilterPanelOpen, hoveredPhotoId } = useUIStore();
  const isDesktop = useMediaQuery('(min-width: 48em)');

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);

  const hasLocation = lat !== null && lon !== null;
  const { data, isLoading, error } = usePhotos({ enabled: hasLocation });
  const photos = useMemo(() => data?.photos ?? [], [data]);
  const total = data?.count ?? 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLat = params.get('lat');
    const urlLon = params.get('lon');
    const urlQ = params.get('q');
    if (urlLat && urlLon) setLocation(parseFloat(urlLat), parseFloat(urlLon));
    if (urlQ) setQuery(urlQ);
  }, [setLocation, setQuery]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (lat !== null && lon !== null) {
      params.set('lat', lat.toFixed(5));
      params.set('lon', lon.toFixed(5));
    }
    if (query) params.set('q', query);
    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    if (newUrl !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', newUrl);
    }
  }, [lat, lon, query]);

  const handleMapClick = (clickLat: number, clickLon: number) => {
    setLocation(clickLat, clickLon);
  };

  const handleBoundsChange = (_bounds: MapBounds) => {};

  const handleLocationSelect = (_lat: number, _lon: number, _label: string) => {};

  const handlePhotoClick = (photo: EnhancedPhoto) => {
    const idx = photos.findIndex(
      (p) => p.objectId === photo.objectId && p.layerId === photo.layerId,
    );
    setPreviewIndex(idx >= 0 ? idx : 0);
    setPreviewOpen(true);
  };

  const handleMapReady = useCallback((map: maplibregl.Map) => {
    setMapInstance(map);
  }, []);

  const center: [number, number] | undefined =
    lat !== null && lon !== null ? [lon, lat] : undefined;

  return (
    <div className="search-layout relative h-[calc(100dvh-var(--mobile-nav-height,0px))] overflow-hidden overscroll-none md:h-dvh">
      <div className="absolute inset-x-0 top-0 h-[clamp(240px,42dvh,360px)] touch-none md:fixed md:inset-y-0 md:left-[var(--sidebar-width)] md:h-full">
        <ErrorBoundary>
          <MapView
            className="h-full w-full rounded-none"
            center={center}
            zoom={center ? 14 : undefined}
            onBoundsChange={handleBoundsChange}
            onClick={handleMapClick}
            onMapReady={handleMapReady}
          />
        </ErrorBoundary>
        <PhotoFootprints
          map={mapInstance}
          photos={photos}
          hoveredPhotoId={hoveredPhotoId}
          onPhotoClick={handlePhotoClick}
        />
      </div>

      <div className="absolute inset-x-0 top-[clamp(240px,42dvh,360px)] bottom-0 z-1 flex min-h-0 flex-col overflow-hidden rounded-t-3xl border border-border bg-white shadow-2xl dark:bg-popover md:inset-x-auto md:top-4 md:bottom-4 md:left-4 md:w-[clamp(410px,33vw,480px)] md:rounded-2xl">
        <div className="relative z-20 shrink-0 border-b border-border bg-white p-3 dark:bg-popover">
          <div className="flex items-center gap-2 [&>:first-child]:min-w-0 [&>:first-child]:flex-1">
            <SearchBar size="md" onLocationSelect={handleLocationSelect} />
            <Tooltip label="AI search">
              <button
                type="button"
                onClick={() => setAiSearchOpen(true)}
                aria-label="AI search"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-600 transition duration-100 hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <IconSparkles size={18} />
              </button>
            </Tooltip>
            <Tooltip label={filterPanelOpen ? 'Hide filters' : 'Show filters'}>
              <button
                type="button"
                onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                aria-label="Toggle filters"
                aria-expanded={filterPanelOpen}
                className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
                  filterPanelOpen
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white',
                )}
              >
                <IconAdjustments size={18} />
              </button>
            </Tooltip>
          </div>
        </div>

        <div className="isolate min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain p-4">
          {isDesktop && filterPanelOpen && (
            <div className="mb-4 border-b border-border">
              <FilterPanel onClose={() => setFilterPanelOpen(false)} />
            </div>
          )}
          <SearchResults
            query={query}
            hasLocation={hasLocation}
            photos={photos}
            total={total}
            isLoading={isLoading}
            error={error instanceof Error ? error : null}
            onPhotoClick={handlePhotoClick}
          />
        </div>
      </div>

      {!isDesktop && <MobileFilterSheet />}

      <Suspense fallback={null}>
        {previewOpen && (
          <PhotoPreviewModal
            photo={photos[previewIndex] ?? null}
            photos={photos}
            opened={previewOpen}
            onClose={() => setPreviewOpen(false)}
            initialIndex={previewIndex}
          />
        )}
      </Suspense>

      <Suspense fallback={null}>
        {aiSearchOpen && (
          <AISearchModal opened={aiSearchOpen} onClose={() => setAiSearchOpen(false)} />
        )}
      </Suspense>
    </div>
  );
}

export function SearchPageIsland() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <SearchPageContent />
      </ErrorBoundary>
    </AppProviders>
  );
}

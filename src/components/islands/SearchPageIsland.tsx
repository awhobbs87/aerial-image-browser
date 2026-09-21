import { useSearchLocation } from '@/hooks/useSearchLocation';
import { Suspense, lazy, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { FunnelSimpleIcon, SparkleIcon } from '@phosphor-icons/react';
import { Toolbar } from '@cloudflare/kumo/components/toolbar';
import type maplibregl from 'maplibre-gl';
import { MapSearchCommandPalette } from '../search/MapSearchCommandPalette';
import { SearchResults } from '../search/SearchResults';
import { useShallow } from 'zustand/react/shallow';
import { PhotoFootprints } from '../map/PhotoFootprints';
import { FilterPanel } from '../filters/FilterPanel';
import { MobileFilterSheet } from '../filters/MobileFilterSheet';
import { AppProviders } from '../common/AppProviders';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useSearchStore } from '@/stores/searchStore';
import { useUIStore } from '@/stores/uiStore';
import { usePhotos } from '@/hooks/usePhotos';
import type { EnhancedPhoto } from '@/types/photo';
import { useFilterStore } from '@/stores/filterStore';
import { readSearchView, saveSearchView } from '@/lib/search-view';
import { useMediaQuery } from '@/hooks/useMediaQuery';

const MapView = lazy(async () => ({ default: (await import('../map/MapView')).MapView }));

const PhotoPreviewModal = lazy(async () => {
  const module = await import('../photos/PhotoPreviewModal');
  return { default: module.PhotoPreviewModal };
});
const AISearchModal = lazy(async () => {
  const module = await import('../search/AISearchModal');
  return { default: module.AISearchModal };
});

function SearchPageContent() {
  const { lat, lon, query, setLocation } = useSearchStore(
    useShallow(({ lat, lon, query, setLocation }) => ({
      lat,
      lon,
      query,
      setLocation,
    })),
  );
  const filterPanelOpen = useUIStore((s) => s.filterPanelOpen);
  const setFilterPanelOpen = useUIStore((s) => s.setFilterPanelOpen);
  const isDesktop = useMediaQuery('(min-width: 48em)');

  const urlReady = useSearchLocation();
  const [mapEnabled, setMapEnabled] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const filters = useFilterStore(
    useShallow(({ layers, startYear, endYear, scaleCategories, sortBy }) => ({
      layers,
      startYear,
      endYear,
      scaleCategories,
      sortBy,
    })),
  );
  const viewKey = JSON.stringify([lat, lon, query, filters]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMapEnabled(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [aiSearchOpen, setAiSearchOpen] = useState(false);

  const hasLocation = lat !== null && lon !== null;
  const { data, isLoading, error } = usePhotos({ enabled: hasLocation && urlReady });
  const photos = useMemo(() => data?.photos ?? [], [data]);
  const total = data?.count ?? 0;

  useEffect(() => {
    if (!urlReady || isLoading || !resultsRef.current) return;
    const element = resultsRef.current;
    const restore = () => {
      element.scrollTop = readSearchView(viewKey).scrollTop;
    };
    const frame = requestAnimationFrame(restore);
    const save = () => saveSearchView(viewKey, { scrollTop: element.scrollTop });
    document.addEventListener('astro:before-swap', save);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('astro:before-swap', save);
    };
  }, [viewKey, urlReady, isLoading]);

  const handlePhotoClick = useCallback(
    (photo: EnhancedPhoto) => {
      const idx = photos.findIndex(
        (p) => p.objectId === photo.objectId && p.layerId === photo.layerId,
      );
      setPreviewIndex(idx >= 0 ? idx : 0);
      setPreviewOpen(true);
    },
    [photos],
  );

  const handleMapReady = useCallback((map: maplibregl.Map) => {
    setMapInstance(map);
  }, []);

  const center: [number, number] | undefined =
    lat !== null && lon !== null ? [lon, lat] : undefined;

  return (
    <div className="search-layout relative h-[calc(100dvh-var(--mobile-nav-height,0px))] overflow-hidden overscroll-none md:h-dvh">
      <div className="absolute inset-x-0 top-0 h-[clamp(240px,42dvh,360px)] touch-none md:fixed md:inset-y-0 md:left-[var(--sidebar-width)] md:h-full">
        <ErrorBoundary>
          <Suspense
            fallback={
              <div
                className="h-full w-full animate-pulse bg-slate-200 dark:bg-slate-900"
                role="status"
                aria-label="Loading map"
              />
            }
          >
            {mapEnabled && (
              <MapView
                className="h-full w-full rounded-none"
                center={center}
                zoom={center ? 14 : undefined}
                onClick={(lat, lon) => {
                  setLocation(lat, lon);
                  useSearchStore.getState().setQuery('Selected map location');
                }}
                onMapReady={handleMapReady}
              />
            )}
          </Suspense>
        </ErrorBoundary>
        <PhotoFootprints map={mapInstance} photos={photos} onPhotoClick={handlePhotoClick} />
      </div>

      <div className="absolute inset-x-0 top-[clamp(240px,42dvh,360px)] bottom-0 z-1 flex min-h-0 flex-col overflow-hidden rounded-t-3xl border border-border bg-white shadow-2xl dark:bg-popover md:inset-x-auto md:top-4 md:bottom-4 md:left-4 md:w-[clamp(410px,33vw,480px)] md:rounded-2xl">
        <div className="relative z-20 shrink-0 border-b border-border bg-white p-3 dark:bg-popover">
          <Toolbar className="w-full">
            <MapSearchCommandPalette disabled={!urlReady} />
            <Toolbar.Button
              disabled={!urlReady}
              icon={SparkleIcon}
              onClick={() => setAiSearchOpen(true)}
              aria-label="AI search"
              title="AI search"
            />
            <Toolbar.Button
              disabled={!urlReady}
              icon={FunnelSimpleIcon}
              onClick={() => setFilterPanelOpen(!filterPanelOpen)}
              aria-label={filterPanelOpen ? 'Hide filters' : 'Show filters'}
              aria-expanded={filterPanelOpen}
              title={filterPanelOpen ? 'Hide filters' : 'Show filters'}
              data-active={filterPanelOpen || undefined}
            />
          </Toolbar>
        </div>

        <div
          ref={resultsRef}
          data-search-results-scroll
          onScroll={(event) => {
            if (urlReady && !isLoading)
              saveSearchView(viewKey, { scrollTop: event.currentTarget.scrollTop });
          }}
          className="isolate min-h-0 flex-1 touch-pan-y overflow-x-hidden overflow-y-auto overscroll-contain py-4 pr-4 pl-5"
        >
          {isDesktop && filterPanelOpen && (
            <div className="mb-4 border-b border-border">
              <FilterPanel onClose={() => setFilterPanelOpen(false)} />
            </div>
          )}
          <SearchResults
            restorationKey={viewKey}
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

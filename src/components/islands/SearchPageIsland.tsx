import { Suspense, lazy, useEffect, useState, useMemo, useCallback } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconAdjustments, IconSparkles } from '@tabler/icons-react';
import type maplibregl from 'maplibre-gl';
import { MantineWrapper } from '../common/MantineWrapper';
import { SearchBar } from '../search/SearchBar';
import { SearchResults } from '../search/SearchResults';
import { MapView } from '../map/MapView';
import { PhotoFootprints } from '../map/PhotoFootprints';
import { FilterPanel } from '../filters/FilterPanel';
import { MobileFilterSheet } from '../filters/MobileFilterSheet';
import { useSearchStore } from '@/stores/searchStore';
import { useUIStore } from '@/stores/uiStore';
import { usePhotos } from '@/hooks/usePhotos';
import type { EnhancedPhoto } from '@/types/photo';
import type { MapBounds } from '@/types/map';

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

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLat = params.get('lat');
    const urlLon = params.get('lon');
    const urlQ = params.get('q');
    if (urlLat && urlLon) setLocation(parseFloat(urlLat), parseFloat(urlLon));
    if (urlQ) setQuery(urlQ);
  }, [setLocation, setQuery]);

  // Sync search state back to URL so reloads preserve progress
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
    <div className="search-layout">
      <div className="search-map">
        <MapView
          className="map-fill"
          center={center}
          zoom={center ? 14 : undefined}
          onBoundsChange={handleBoundsChange}
          onClick={handleMapClick}
          onMapReady={handleMapReady}
        />
        {/* Renderless component: manages footprint layers on the map */}
        <PhotoFootprints
          map={mapInstance}
          photos={photos}
          hoveredPhotoId={hoveredPhotoId}
          onPhotoClick={handlePhotoClick}
        />
      </div>

      <div className="search-panel">
        <div className="search-panel-header">
          <div className="search-panel-bar">
            <SearchBar size="md" onLocationSelect={handleLocationSelect} />
            <Tooltip label="AI search" withArrow>
              <ActionIcon
                variant="subtle"
                size="lg"
                onClick={() => setAiSearchOpen(true)}
                aria-label="AI search"
                style={{ flexShrink: 0 }}
              >
                <IconSparkles size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={filterPanelOpen ? 'Hide filters' : 'Show filters'} withArrow>
              <ActionIcon
                variant={filterPanelOpen ? 'filled' : 'subtle'}
                color={filterPanelOpen ? 'emerald' : undefined}
                size="lg"
                onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                aria-label="Toggle filters"
                style={{ flexShrink: 0 }}
              >
                <IconAdjustments size={18} />
              </ActionIcon>
            </Tooltip>
          </div>
        </div>

        {isDesktop && filterPanelOpen && (
          <div className="search-panel-filters">
            <FilterPanel onClose={() => setFilterPanelOpen(false)} />
          </div>
        )}

        <div className="search-panel-content">
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
    <MantineWrapper>
      <SearchPageContent />
    </MantineWrapper>
  );
}

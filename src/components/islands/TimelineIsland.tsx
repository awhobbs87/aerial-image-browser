import { ComparisonTray } from '@/components/compare/ComparePhotoButton';
import { SearchAvailability } from '@/components/search/SearchAvailability';
import { lazy, Suspense, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Toolbar } from '@cloudflare/kumo/components/toolbar';
import { Button } from '@cloudflare/kumo/components/button';
import { AppProviders } from '@/components/common/AppProviders';
import { MapSearchCommandPalette } from '@/components/search/MapSearchCommandPalette';
import { PhotoTimeline } from '@/components/photos/PhotoTimeline';
import { usePhotos } from '@/hooks/usePhotos';
import { useSearchLocation } from '@/hooks/useSearchLocation';
import { useSearchStore } from '@/stores/searchStore';
import { useFilterStore } from '@/stores/filterStore';
const Preview = lazy(async () => ({
  default: (await import('@/components/photos/PhotoPreviewModal')).PhotoPreviewModal,
}));
function TimelineContent() {
  const ready = useSearchLocation();
  const { lat, query } = useSearchStore(useShallow(({ lat, query }) => ({ lat, query })));
  const { data, isLoading, error, refresh, isFetching } = usePhotos({ enabled: ready });
  const [selected, setSelected] = useState<number | null>(null);
  const photos = data?.photos || [];
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ComparisonTray />
      <Toolbar>
        <MapSearchCommandPalette disabled={!ready} />
      </Toolbar>
      {!ready || isLoading ? (
        <PhotoTimeline photos={[]} isLoading />
      ) : lat === null ? (
        <div className="app-empty-state">
          <h2>Choose a location first</h2>
          <p>Search above to explore aerial photos by year.</p>
        </div>
      ) : error && !data ? (
        <div role="alert">
          <p>Unable to load this timeline. {error.message}</p>
          <Button onClick={() => void refresh()}>Try again</Button>
        </div>
      ) : (
        <>
          {error && (
            <p role="alert">Refresh failed. Showing the previous results. {error.message}</p>
          )}
          <Button variant="ghost" loading={isFetching} onClick={() => void refresh()}>
            Refresh imagery
          </Button>
          {!!data?.failedLayers?.length && (
            <div role="status">
              Some imagery unavailable. Counts are incomplete.
              <Button onClick={() => void refresh(true)}>Retry unavailable layers</Button>
            </div>
          )}
          <SearchAvailability
            photos={data?.availablePhotos || []}
            count={photos.length}
            partial={!!data?.failedLayers?.length}
          />
          <p className="text-sm text-muted-foreground">
            {photos.length} photos · {query || 'Selected map location'}
          </p>
          {!photos.length && (
            <Button onClick={() => useFilterStore.getState().resetFilters()}>Clear filters</Button>
          )}
          <PhotoTimeline
            photos={photos}
            isLoading={false}
            onPhotoClick={(photo) =>
              setSelected(
                photos.findIndex(
                  (p) => p.objectId === photo.objectId && p.layerId === photo.layerId,
                ),
              )
            }
          />
        </>
      )}
      {selected !== null && (
        <Suspense fallback={null}>
          <Preview
            photo={photos[selected] || null}
            photos={photos}
            initialIndex={selected}
            opened
            onClose={() => setSelected(null)}
          />
        </Suspense>
      )}
    </div>
  );
}
export function TimelineIsland() {
  return (
    <AppProviders>
      <TimelineContent />
    </AppProviders>
  );
}

import { useEffect, useState, useMemo } from 'react';
import { MantineWrapper } from '../common/MantineWrapper';
import { SearchBar } from '../search/SearchBar';
import { SearchResults } from '../search/SearchResults';
import { PhotoPreviewModal } from '../photos/PhotoPreviewModal';
import { MapView } from '../map/MapView';
import { useSearchStore } from '@/stores/searchStore';
import { usePhotos } from '@/hooks/usePhotos';
import type { EnhancedPhoto } from '@/types/photo';
import type { MapBounds } from '@/types/map';

/**
 * Self-contained island for the entire search page.
 * Combines map, search bar, results, and preview modal in a single React tree
 * so they share one QueryClient and can communicate via Zustand stores.
 */
function SearchPageContent() {
  const { lat, lon, setLocation, setQuery } = useSearchStore();

  // Preview modal state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

  // We need the photos array for the gallery modal
  const hasLocation = lat !== null && lon !== null;
  const { data } = usePhotos({ enabled: hasLocation });
  const photos = useMemo(() => (data?.photos ?? []) as unknown as EnhancedPhoto[], [data]);

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLat = params.get('lat');
    const urlLon = params.get('lon');
    const urlQ = params.get('q');

    if (urlLat && urlLon) {
      setLocation(parseFloat(urlLat), parseFloat(urlLon));
    }
    if (urlQ) {
      setQuery(urlQ);
    }
  }, [setLocation, setQuery]);

  const handleMapClick = (clickLat: number, clickLon: number) => {
    setLocation(clickLat, clickLon);
  };

  const handleBoundsChange = (_bounds: MapBounds) => {
    // Could trigger bounds-based search in the future
  };

  const handleLocationSelect = (_lat: number, _lon: number, _label: string) => {
    // SearchBar already updates the store; the map reacts via center prop
  };

  const handlePhotoClick = (photo: EnhancedPhoto) => {
    // Find this photo's index in the current list for gallery navigation
    const idx = photos.findIndex(
      (p) => p.objectId === photo.objectId && p.layerId === photo.layerId,
    );
    setPreviewIndex(idx >= 0 ? idx : 0);
    setPreviewOpen(true);
  };

  const center: [number, number] | undefined =
    lat !== null && lon !== null ? [lon, lat] : undefined;

  return (
    <div className="search-layout">
      {/* Map fills the background */}
      <div className="search-map">
        <MapView
          className="map-fill"
          center={center}
          zoom={center ? 14 : undefined}
          onBoundsChange={handleBoundsChange}
          onClick={handleMapClick}
        />
      </div>

      {/* Results panel */}
      <div className="search-panel">
        <div className="search-panel-header">
          <SearchBar size="md" onLocationSelect={handleLocationSelect} />
        </div>
        <div className="search-panel-content">
          <SearchResults onPhotoClick={handlePhotoClick} />
        </div>
      </div>

      {/* Photo preview modal (gallery mode) */}
      <PhotoPreviewModal
        photo={photos[previewIndex] ?? null}
        photos={photos}
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        initialIndex={previewIndex}
      />
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

import { lazy, Suspense, useState } from 'react';
import { navigate } from 'astro:transitions/client';
import { Button, LinkButton } from '@cloudflare/kumo/components/button';
import type { EnhancedPhoto } from '@/types/photo';
import { usePhotoMetadata } from '@/hooks/usePhotoMetadata';
import { photoDateLabel } from '@/lib/photo-metadata';
import { formatScale, getLayerTypeLabel } from '@/lib/format';
import { photoImageUrl } from '@/lib/photo-images';
import { useFilterStore } from '@/stores/filterStore';
import { useSearchStore } from '@/stores/searchStore';
import type { SearchReference } from '@/components/viewer/LocationReference';
const Reference = lazy(async () => ({
  default: (await import('@/components/viewer/LocationReference')).LocationReference,
}));
export function PhotoDetails({
  layerId,
  imageName,
  initial,
  reference,
}: {
  layerId: number;
  imageName: string;
  initial?: EnhancedPhoto;
  reference?: SearchReference;
}) {
  const { data: photo, error, isLoading, refetch } = usePhotoMetadata(layerId, imageName, initial);
  const [mapOpen, setMapOpen] = useState(false);
  if (isLoading)
    return (
      <p role="status" className="p-4">
        Loading photo details…
      </p>
    );
  if (!photo)
    return (
      <div className="p-4" role="alert">
        Photo details unavailable.<Button onClick={() => void refetch()}>Retry details</Button>
      </div>
    );
  const values = [
    ['Captured', photoDateLabel(photo)],
    ['Survey', photo.layerName || 'Unknown'],
    ['Imagery', getLayerTypeLabel(photo.layerId)],
    ['Image type', photo.type || 'Unknown'],
    ['Reference', photo.name],
    ['Run', photo.run || 'Unknown'],
    ['Film number', photo.filmType || 'Unknown'],
    ['Frame', photo.photoNo || 'Unknown'],
    ['Scale', formatScale(photo.scale) || 'Unknown'],
  ];
  const moreFromSurvey = () => {
    const filters = useFilterStore.getState();
    filters.resetFilters();
    filters.setSurvey(photo.layerName);
    const search = useSearchStore.getState();
    const point = photo.rings?.[0]?.[0];
    if (search.lat === null && point) {
      search.setLocation(point[1], point[0]);
      search.setQuery(photo.layerName);
    }
    void navigate('/search');
  };
  return (
    <div className="space-y-4 p-4">
      {error && (
        <p role="status">
          Showing previously loaded metadata.{' '}
          <Button onClick={() => void refetch()}>Retry details</Button>
        </p>
      )}
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
        {values.map(([label, value]) => (
          <div className="contents" key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="break-words font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        Scale describes the original photography, not guaranteed scan sharpness. Survey years are
        estimates when the capture date is missing.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => setMapOpen(!mapOpen)} aria-expanded={mapOpen}>
          {mapOpen ? 'Hide coverage map' : 'Show coverage map'}
        </Button>
        {photo.layerName && (
          <Button variant="secondary" onClick={moreFromSurvey}>
            More from this survey here
          </Button>
        )}
        {photo.tiffUrl && (
          <LinkButton href={photo.tiffUrl} target="_blank" external variant="secondary">
            Download original TIFF
          </LinkButton>
        )}
        <LinkButton
          href={photoImageUrl(photo, 'preview-1600')}
          download={`${photo.name}-preview.webp`}
          variant="secondary"
        >
          Download preview
        </LinkButton>
      </div>
      <p className="text-xs text-muted-foreground">
        Survey filtering applies to the current search location or area. Source: LIST Tasmania.
        Previews may have less detail than the original.
      </p>
      {mapOpen && (
        <Suspense fallback={<p role="status">Loading coverage map…</p>}>
          <Reference layerId={photo.layerId} imageName={photo.name} reference={reference} />
        </Suspense>
      )}
    </div>
  );
}

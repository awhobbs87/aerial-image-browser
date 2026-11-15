import { Button, LinkButton } from '@cloudflare/kumo/components/button';
import type { EnhancedPhoto } from '@/types/photo';
import { useComparisonStore } from '@/stores/comparisonStore';
export function ComparePhotoButton({ photo }: { photo: EnhancedPhoto }) {
  const { photoA, photoB, setPhotoA, setPhotoB } = useComparisonStore();
  const selected = [photoA, photoB].some(
    (p) => p?.layerId === photo.layerId && p?.objectId === photo.objectId,
  );
  if (selected)
    return (
      <LinkButton href="/compare" variant="secondary">
        View comparison
      </LinkButton>
    );
  return (
    <Button
      variant="secondary"
      disabled={!!photoA && !!photoB}
      onClick={() => {
        if (!photoA) setPhotoA(photo);
        else if (!photoB) setPhotoB(photo);
      }}
    >
      {photoA && photoB ? 'Comparison full' : 'Add to compare'}
    </Button>
  );
}
export function ComparisonTray() {
  const { photoA, photoB, setPhotoA, setPhotoB } = useComparisonStore();
  if (!photoA && !photoB) return null;
  return (
    <section
      aria-label="Selected comparison photos"
      className="space-y-2 rounded-xl bg-amber-500/10 p-3 text-sm"
    >
      <p className="font-semibold">Compare {Number(!!photoA) + Number(!!photoB)} of 2 photos</p>
      {[photoA, photoB].map(
        (photo, index) =>
          photo && (
            <div key={index} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate">
                {photo.year || 'Undated'} · {photo.name}
              </span>
              <Button
                variant="ghost"
                aria-label={`Remove ${photo.name} from comparison`}
                onClick={() => (index === 0 ? setPhotoA(null) : setPhotoB(null))}
              >
                Remove
              </Button>
            </div>
          ),
      )}
      <LinkButton href="/compare" variant="secondary">
        Open comparison
      </LinkButton>
    </section>
  );
}

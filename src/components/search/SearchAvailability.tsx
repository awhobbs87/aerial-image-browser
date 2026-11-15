import { Button } from '@cloudflare/kumo/components/button';
import { useFilterStore } from '@/stores/filterStore';
import { getLayerTypeLabel } from '@/lib/format';
import type { EnhancedPhoto } from '@/types/photo';
export function SearchAvailability({
  photos,
  count,
  partial = false,
}: {
  photos: EnhancedPhoto[];
  count: number;
  partial?: boolean;
}) {
  const setDateRange = useFilterStore((s) => s.setDateRange);
  const years = photos.map((p) => p.year).filter((year) => year > 0);
  const decades = new Map<number, number>();
  years.forEach((year) => {
    const decade = Math.floor(year / 10) * 10;
    decades.set(decade, (decades.get(decade) || 0) + 1);
  });
  const max = Math.max(1, ...decades.values());
  return (
    <section aria-label="Imagery availability" className="space-y-2 text-xs text-muted-foreground">
      <p className="font-semibold text-foreground">
        Showing {count} of {photos.length} {partial ? 'available ' : ''}photos
      </p>
      {!!years.length && (
        <p>
          {Math.min(...years)}–{Math.max(...years)} · Includes inferred survey years
        </p>
      )}
      <p>
        {[0, 1, 2]
          .map((id) => `${getLayerTypeLabel(id)}: ${photos.filter((p) => p.layerId === id).length}`)
          .join(' · ')}
      </p>
      <div className="flex flex-wrap gap-1" aria-label="Photos by decade">
        {[...decades]
          .sort(([a], [b]) => a - b)
          .map(([decade, total]) => (
            <Button
              key={decade}
              variant="ghost"
              className="h-auto min-h-11 flex-col gap-1 px-2"
              onClick={() => setDateRange(decade, decade + 9)}
              aria-label={`Filter ${decade}s, ${total} photos`}
            >
              <span className="h-1 w-full rounded bg-amber-500/20">
                <span
                  className="block h-full rounded bg-amber-500"
                  style={{ width: `${(total / max) * 100}%` }}
                />
              </span>
              <span>
                {decade}s ({total})
              </span>
            </Button>
          ))}
      </div>
      <p>
        {photos.filter((p) => !p.year).length} dates unknown ·{' '}
        {photos.filter((p) => !p.scale).length} scales unknown
      </p>
    </section>
  );
}

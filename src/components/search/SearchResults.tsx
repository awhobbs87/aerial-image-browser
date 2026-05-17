import { useFilterStore } from '@/stores/filterStore';
import { PhotoGrid } from '@/components/photos/PhotoGrid';
import { IconAdjustments, IconMapPin } from '@tabler/icons-react';
import { useUIStore } from '@/stores/uiStore';
import { SCALE_CATEGORIES } from '@/types/photo';
import type { EnhancedPhoto } from '@/types/photo';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/cn';

interface SearchResultsProps {
  query: string;
  hasLocation: boolean;
  photos: EnhancedPhoto[];
  total: number;
  isLoading: boolean;
  error: Error | null;
  onPhotoClick?: (photo: EnhancedPhoto) => void;
  onPhotoCompare?: (photo: EnhancedPhoto) => void;
}

/** Trim a verbose geocoded label to just the first two meaningful parts */
function shortLocation(raw: string): { primary: string; secondary: string } {
  if (!raw) return { primary: 'Nearby', secondary: '' };
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  // Drop postcode-only segments and country
  const meaningful = parts.filter((p) => !/^\d{4,5}$/.test(p) && p !== 'Australia');
  return {
    primary: meaningful[0] || parts[0] || raw,
    secondary: meaningful.slice(1, 3).join(', '),
  };
}

export function SearchResults({
  query,
  hasLocation,
  photos,
  total,
  isLoading,
  error,
  onPhotoClick,
  onPhotoCompare,
}: SearchResultsProps) {
  const { setFilterPanelOpen } = useUIStore();
  const { scaleCategories, toggleScaleCategory } = useFilterStore();
  const isDesktop = useMediaQuery('(min-width: 48em)');

  if (!hasLocation) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
          Search for a location
        </p>
        <p className="max-w-72 text-sm text-slate-500 dark:text-slate-400">
          Enter a place name or click on the map to find aerial photos.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <p className="text-base font-semibold text-red-600 dark:text-red-400">
          Error loading photos
        </p>
        <p className="max-w-80 text-sm text-slate-500 dark:text-slate-400">{error.message}</p>
      </div>
    );
  }

  const loc = shortLocation(query);

  return (
    <div className="flex flex-col gap-3">
      {/* Location header */}
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="flex min-w-0 items-start gap-1.5">
          <IconMapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="truncate text-sm leading-tight font-semibold text-slate-900 dark:text-slate-50">
              {loc.primary}
            </p>
            {loc.secondary && (
              <p className="truncate text-xs leading-tight text-slate-500 dark:text-slate-400">
                {loc.secondary}
              </p>
            )}
          </div>
        </div>
        {!isDesktop && (
          <Tooltip label="Filters">
            <button
              type="button"
              onClick={() => setFilterPanelOpen(true)}
              aria-label="Open filters"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <IconAdjustments size={16} />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Always-visible scale filter row */}
      <div className="flex flex-wrap gap-1">
        {SCALE_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            onClick={() => toggleScaleCategory(cat.key)}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-semibold transition duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600',
              scaleCategories.includes(cat.key)
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-950/5 text-slate-600 hover:bg-slate-950/10 dark:bg-white/7 dark:text-slate-300 dark:hover:bg-white/12',
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      <PhotoGrid
        photos={photos}
        isLoading={isLoading}
        total={total}
        onPhotoClick={onPhotoClick}
        onPhotoCompare={onPhotoCompare}
      />
    </div>
  );
}

import { ComparisonTray } from '@/components/compare/ComparePhotoButton';
import { SearchAvailability } from './SearchAvailability';
import { getLayerTypeLabel } from '@/lib/format';
import { useFilterStore } from '@/stores/filterStore';
import { PhotoGrid } from '@/components/photos/PhotoGrid';
import { CheckIcon, ImageSquareIcon, MapPinIcon } from '@phosphor-icons/react';
import { Button } from '@cloudflare/kumo/components/button';
import { SCALE_CATEGORIES } from '@/types/photo';
import type { EnhancedPhoto } from '@/types/photo';
import { cn } from '@/lib/cn';

interface SearchResultsProps {
  availablePhotos?: EnhancedPhoto[];
  failedLayers?: number[];
  isFetching?: boolean;
  onRefresh?: (failedOnly?: boolean) => void;
  areaSearch?: boolean;
  restorationKey?: string;
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

const SCALE_DISPLAY = {
  'very-detailed': { title: 'Very detailed', range: 'Up to 1:5,000' },
  detailed: { title: 'Detailed', range: '1:5,000-15,000' },
  standard: { title: 'Standard', range: '1:15,000-40,000' },
  overview: { title: 'Overview', range: 'Over 1:40,000' },
} as const;

export function SearchResults({
  availablePhotos,
  failedLayers = [],
  isFetching,
  onRefresh,
  areaSearch,
  restorationKey,
  query,
  hasLocation,
  photos,
  total,
  isLoading,
  error,
  onPhotoClick,
  onPhotoCompare,
}: SearchResultsProps) {
  const {
    layers,
    startYear,
    endYear,
    scaleCategories,
    toggleScaleCategory,
    resetFilters,
    includeUnknownDates,
    includeUnknownScales,
    survey,
  } = useFilterStore();
  const filtersActive =
    !includeUnknownDates ||
    !includeUnknownScales ||
    !!survey ||
    layers.length !== 3 ||
    ![0, 1, 2].every((layerId) => layers.includes(layerId)) ||
    startYear !== null ||
    endYear !== null ||
    scaleCategories.length > 0;

  if (!hasLocation) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-2 py-10 text-center">
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950/5 text-slate-400 dark:bg-card">
          <MapPinIcon size={21} />
        </div>
        <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
          Search for a location
        </p>
        <p className="max-w-72 text-sm text-slate-500 dark:text-slate-400">
          Enter a place name or click on the map to find aerial photos.
        </p>
      </div>
    );
  }

  if (error && !photos.length) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-2 py-10 text-center">
        <p className="text-base font-semibold text-red-600 dark:text-red-400">
          Error loading photos
        </p>
        <p className="max-w-80 text-sm text-slate-500 dark:text-slate-400">{error.message}</p>
        <Button onClick={() => onRefresh?.()} loading={isFetching}>
          Try again
        </Button>
      </div>
    );
  }

  const loc = shortLocation(query);

  return (
    <div className="flex min-w-0 max-w-full touch-pan-y flex-col gap-3">
      <ComparisonTray />
      {/* Location header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-950/7 pt-1 pb-3 dark:border-border">
        <div className="flex min-w-0 items-start gap-1.5">
          <MapPinIcon size={14} className="mt-0.5 shrink-0 text-slate-400" />
          <div className="min-w-0">
            <p className="truncate text-lg leading-tight font-semibold text-slate-900 dark:text-slate-50">
              {loc.primary}
            </p>
            {loc.secondary && (
              <p className="truncate text-xs leading-tight text-slate-500 dark:text-slate-400">
                {loc.secondary}
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {areaSearch
          ? 'Photos overlapping the outlined map area'
          : 'Photos covering the selected point'}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => onRefresh?.()}
          loading={isFetching}
          disabled={isFetching}
        >
          Refresh imagery
        </Button>
        {filtersActive && (
          <Button variant="ghost" onClick={resetFilters}>
            Clear all filters
          </Button>
        )}
        {isFetching && !isLoading && (
          <span role="status" className="text-xs">
            Updating imagery…
          </span>
        )}
      </div>
      {!!failedLayers.length && (
        <div role="status" className="rounded-xl bg-amber-500/10 p-3 text-sm">
          Some imagery unavailable: {failedLayers.map(getLayerTypeLabel).join(', ')}. Counts are
          incomplete.
          <Button variant="ghost" onClick={() => onRefresh?.(true)} disabled={isFetching}>
            Retry unavailable layers
          </Button>
        </div>
      )}
      {error && (
        <p role="alert">Refresh failed. Showing previously loaded results. {error.message}</p>
      )}
      {!isLoading && availablePhotos && (
        <SearchAvailability
          photos={availablePhotos}
          count={total}
          partial={!!failedLayers.length}
        />
      )}
      <div className="hidden md:block">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-500 uppercase dark:text-slate-400">
            Photo scale
          </p>
          {scaleCategories.length > 0 && (
            <Button
              type="button"
              onClick={() => scaleCategories.forEach(toggleScaleCategory)}
              variant="ghost"
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {SCALE_CATEGORIES.map((cat) => {
            const selected = scaleCategories.includes(cat.key);
            const display = SCALE_DISPLAY[cat.key];

            return (
              <Button
                key={cat.key}
                type="button"
                variant="ghost"
                aria-label={cat.label}
                aria-pressed={selected}
                onClick={() => toggleScaleCategory(cat.key)}
                className={cn(
                  'relative flex h-auto min-h-13 w-full min-w-0 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left shadow-none ring-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-500 focus-visible:ring-0',
                  selected
                    ? 'border-amber-500/55 bg-amber-400/13 text-slate-950 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.08)] dark:border-amber-300/70 dark:bg-amber-300/20 dark:text-white'
                    : 'border-transparent bg-slate-950/4 text-slate-700 hover:bg-slate-950/7 dark:bg-card dark:text-slate-200 dark:hover:bg-white/9',
                )}
              >
                <span className="max-w-[calc(100%-1rem)] truncate text-xs font-bold">
                  {display.title}
                </span>
                <span className="mt-0.5 w-full truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {display.range}
                </span>
                {selected && (
                  <CheckIcon
                    size={14}
                    weight="bold"
                    className="absolute top-2 right-2 text-amber-600 dark:text-amber-300"
                  />
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {!isLoading && photos.length === 0 && filtersActive ? (
        <div className="flex items-center justify-center py-10 text-center">
          <div className="flex flex-col items-center gap-2">
            <ImageSquareIcon size={28} className="mb-1 text-slate-400" />
            <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
              No photos match these filters
            </p>
            <p className="max-w-72 text-sm text-slate-500 dark:text-slate-400">
              Clear filters to check all imagery for this location.
            </p>
            <Button onClick={resetFilters} variant="primary" className="mt-2">
              Clear filters
            </Button>
          </div>
        </div>
      ) : (
        <PhotoGrid
          key={restorationKey}
          restorationKey={restorationKey}
          photos={photos}
          isLoading={isLoading}
          total={total}
          onPhotoClick={onPhotoClick}
          onPhotoCompare={onPhotoCompare}
        />
      )}
    </div>
  );
}

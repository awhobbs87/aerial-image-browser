import { useState, useMemo } from 'react';
import { IconArrowsSort, IconLayoutList } from '@tabler/icons-react';
import type { EnhancedPhoto } from '@/types/photo';
import { useFilterStore } from '@/stores/filterStore';
import { PhotoCard } from './PhotoCard';
import { PhotoSkeleton } from './PhotoSkeleton';

type GroupBy = 'decade' | 'year' | 'none';

interface PhotoGridProps {
  photos: EnhancedPhoto[];
  isLoading: boolean;
  total: number;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onPhotoClick?: (photo: EnhancedPhoto) => void;
  onPhotoCompare?: (photo: EnhancedPhoto) => void;
}

const ITEMS_PER_PAGE = 24;

function getGroupKey(photo: EnhancedPhoto, groupBy: GroupBy): string {
  if (groupBy === 'none') return '__all__';
  if (photo.year <= 0) return 'Undated';
  if (groupBy === 'year') return String(photo.year);
  return `${Math.floor(photo.year / 10) * 10}s`;
}

function compareGroupKeys(a: string, b: string): number {
  if (a === 'Undated') return 1;
  if (b === 'Undated') return -1;
  return a.localeCompare(b);
}

export function PhotoGrid({
  photos,
  isLoading,
  total,
  hasMore = false,
  onLoadMore,
  onPhotoClick,
  onPhotoCompare,
}: PhotoGridProps) {
  const { sortBy, setSortBy } = useFilterStore();
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [groupBy, setGroupBy] = useState<GroupBy>('decade');

  const sortedPhotos = useMemo(() => {
    const sorted = [...photos];
    switch (sortBy) {
      case 'date-desc':
        sorted.sort((a, b) => {
          if (!a.dateFlown && b.dateFlown) return 1;
          if (a.dateFlown && !b.dateFlown) return -1;
          return (b.dateFlown || 0) - (a.dateFlown || 0);
        });
        break;
      case 'date-asc':
        sorted.sort((a, b) => {
          if (!a.dateFlown && b.dateFlown) return 1;
          if (a.dateFlown && !b.dateFlown) return -1;
          return (a.dateFlown || 0) - (b.dateFlown || 0);
        });
        break;
      case 'scale-asc':
        sorted.sort((a, b) => (a.scale || Infinity) - (b.scale || Infinity));
        break;
      case 'scale-desc':
        sorted.sort((a, b) => (b.scale || 0) - (a.scale || 0));
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [photos, sortBy]);

  const groupedPhotos = useMemo(() => {
    const groups: Map<string, EnhancedPhoto[]> = new Map();
    const displayed = sortedPhotos.slice(0, displayCount);

    for (const photo of displayed) {
      const key = getGroupKey(photo, groupBy);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(photo);
    }

    if (groupBy === 'none') return groups;
    return new Map([...groups.entries()].sort((a, b) => compareGroupKeys(a[0], b[0])));
  }, [sortedPhotos, displayCount, groupBy]);

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
    onLoadMore?.();
  };

  const canLoadMore = displayCount < sortedPhotos.length || hasMore;

  if (isLoading && photos.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
        <PhotoSkeleton count={6} />
      </div>
    );
  }

  if (!isLoading && photos.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-center">
        <div className="flex flex-col items-center gap-2">
          <p className="text-base font-semibold text-slate-500 dark:text-slate-400">
            No photos found
          </p>
          <p className="max-w-72 text-sm text-slate-500 dark:text-slate-400">
            Try searching a different location or adjusting your filters.
          </p>
        </div>
      </div>
    );
  }

  const showGroupHeaders = groupBy !== 'none';

  return (
    <div className="flex min-w-0 max-w-full touch-pan-y flex-col gap-3 overflow-x-hidden">
      <div className="flex min-w-0 max-w-full flex-col gap-2 pb-1 sm:flex-row sm:items-center sm:justify-between">
        <span className="min-w-0 truncate text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          {total.toLocaleString()} photo{total !== 1 ? 's' : ''}
        </span>
        <div className="grid min-w-0 max-w-full grid-cols-2 gap-1.5 sm:flex">
          <label className="relative min-w-0">
            <IconLayoutList
              size={12}
              className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.currentTarget.value as GroupBy)}
              aria-label="Group photos by"
              className="h-8 w-full min-w-0 rounded-full border border-slate-950/10 bg-white/80 pr-7 pl-7 text-[11px] font-semibold text-slate-700 outline-none transition hover:bg-white focus:border-sky-600/40 focus:ring-3 focus:ring-sky-600/10 sm:w-auto dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <option value="decade">By decade</option>
              <option value="year">By year</option>
              <option value="none">No grouping</option>
            </select>
          </label>
          <label className="relative min-w-0">
            <IconArrowsSort
              size={12}
              className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-slate-400"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.currentTarget.value as typeof sortBy)}
              aria-label="Sort photos"
              className="h-8 w-full min-w-0 rounded-full border border-slate-950/10 bg-white/80 pr-7 pl-7 text-[11px] font-semibold text-slate-700 outline-none transition hover:bg-white focus:border-sky-600/40 focus:ring-3 focus:ring-sky-600/10 sm:w-auto dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <option value="date-desc">Newest first</option>
              <option value="date-asc">Oldest first</option>
              <option value="scale-asc">Scale (large)</option>
              <option value="scale-desc">Scale (small)</option>
              <option value="name">Name</option>
            </select>
          </label>
        </div>
      </div>

      {Array.from(groupedPhotos.entries()).map(([groupKey, groupPhotos]) => (
        <div key={groupKey} className="mb-1 min-w-0 max-w-full overflow-x-hidden">
          {showGroupHeaders && (
            <div className="mb-1.5 flex items-center gap-2 py-1">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {groupKey}
              </span>
              <span className="text-[11px] font-bold text-sky-700 dark:text-sky-400">
                {groupPhotos.length}
              </span>
            </div>
          )}
          <div className="grid min-w-0 max-w-full grid-cols-2 gap-2.5 overflow-x-hidden md:grid-cols-3">
            {groupPhotos.map((photo) => (
              <PhotoCard
                key={`${photo.layerId}-${photo.objectId}`}
                photo={photo}
                onClick={onPhotoClick}
                onCompare={onPhotoCompare}
              />
            ))}
          </div>
        </div>
      ))}

      {canLoadMore && (
        <div className="flex justify-center py-3">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={isLoading}
            className="h-9 rounded-full px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-950/5 hover:text-slate-950 disabled:cursor-wait disabled:opacity-50 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            {isLoading ? 'Loading...' : 'Load more photos'}
          </button>
        </div>
      )}
    </div>
  );
}

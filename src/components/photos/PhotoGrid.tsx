import { readSearchView, saveSearchView } from '@/lib/search-view';
import { useState, useMemo } from 'react';
import { Badge } from '@cloudflare/kumo/components/badge';
import { Button } from '@cloudflare/kumo/components/button';
import { Select } from '@cloudflare/kumo/components/select';
import type { EnhancedPhoto } from '@/types/photo';
import { useFilterStore } from '@/stores/filterStore';
import { PhotoCard } from './PhotoCard';
import { PhotoSkeleton } from './PhotoSkeleton';

type GroupBy = 'decade' | 'year' | 'none';

interface PhotoGridProps {
  restorationKey?: string;
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
  restorationKey,
  photos,
  isLoading,
  total,
  hasMore = false,
  onLoadMore,
  onPhotoClick,
  onPhotoCompare,
}: PhotoGridProps) {
  const sortBy = useFilterStore((s) => s.sortBy);
  const setSortBy = useFilterStore((s) => s.setSortBy);
  const [displayCount, setDisplayCount] = useState(
    () => readSearchView(restorationKey).displayCount,
  );
  const [groupBy, setGroupBy] = useState<GroupBy>(() => readSearchView(restorationKey).groupBy);

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
    const next = displayCount + ITEMS_PER_PAGE;
    setDisplayCount(next);
    if (restorationKey) saveSearchView(restorationKey, { displayCount: next });
    onLoadMore?.();
  };

  const canLoadMore = displayCount < sortedPhotos.length || hasMore;

  if (isLoading && photos.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2.5 ">
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
      <div className="flex min-w-0 max-w-full flex-col gap-2.5 border-y border-slate-950/7 py-3 dark:border-border">
        <Badge
          variant="outline"
          className="border-border bg-card/58 px-2 py-1 text-xs font-bold text-muted-foreground uppercase backdrop-blur-xl"
        >
          {total.toLocaleString()} photo{total !== 1 ? 's' : ''}
        </Badge>
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <Select
            label="Group"
            size="lg"
            value={groupBy}
            onValueChange={(value) => {
              if (!value) return;
              setGroupBy(value as GroupBy);
              if (restorationKey) saveSearchView(restorationKey, { groupBy: value as GroupBy });
            }}
            items={{ decade: 'Decade', year: 'Year', none: 'None' }}
          />
          <Select
            label="Sort"
            size="lg"
            value={sortBy}
            onValueChange={(value) => value && setSortBy(value as typeof sortBy)}
            items={{
              'date-desc': 'Newest first',
              'date-asc': 'Oldest first',
              'scale-asc': 'Largest scale',
              'scale-desc': 'Smallest scale',
              name: 'Name',
            }}
          />
        </div>
      </div>

      {Array.from(groupedPhotos.entries()).map(([groupKey, groupPhotos]) => (
        <div key={groupKey} className="mb-1 min-w-0 max-w-full overflow-x-hidden">
          {showGroupHeaders && (
            <div className="mb-1.5 flex items-center gap-2 py-1">
              <span className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
                {groupKey}
              </span>
              <Badge variant="info" className="px-2 py-0.5 text-xs font-bold">
                {groupPhotos.length}
              </Badge>
            </div>
          )}
          <div className="grid min-w-0 max-w-full grid-cols-2 gap-2.5 overflow-x-hidden ">
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
          <Button
            variant="ghost"
            size="base"
            onClick={handleLoadMore}
            loading={isLoading}
            disabled={isLoading}
          >
            Load more photos
          </Button>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { SimpleGrid, NativeSelect, Text, Button, Stack, Center, Group } from '@mantine/core';
import { IconArrowsSort, IconLayoutList } from '@tabler/icons-react';
import type { EnhancedPhoto } from '@/types/photo';
import { useFilterStore } from '@/stores/filterStore';
import { PhotoCard } from './PhotoCard';
import { PhotoSkeleton } from './PhotoSkeleton';
import classes from './PhotoGrid.module.css';

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

/** Derive the grouping key for a photo given the current groupBy mode. */
function getGroupKey(photo: EnhancedPhoto, groupBy: GroupBy): string {
  if (groupBy === 'none') return '__all__';
  if (photo.year <= 0) return 'Undated';
  if (groupBy === 'year') return String(photo.year);
  // decade
  return `${Math.floor(photo.year / 10) * 10}s`;
}

/** Compare two group keys for chronological ordering. */
function compareGroupKeys(a: string, b: string): number {
  if (a === 'Undated') return 1;
  if (b === 'Undated') return -1;
  // Both are numeric strings ("1982" or "1980s") — sort lexicographically (works for years/decades)
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

  // Sort photos — undated (dateFlown=0) pushed to the end for date sorts
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

  // Group visible photos by the selected groupBy mode
  const groupedPhotos = useMemo(() => {
    const groups: Map<string, EnhancedPhoto[]> = new Map();
    const displayed = sortedPhotos.slice(0, displayCount);

    for (const photo of displayed) {
      const key = getGroupKey(photo, groupBy);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(photo);
    }

    if (groupBy === 'none') return groups;

    // Sort groups chronologically; 'Undated' always last
    return new Map([...groups.entries()].sort((a, b) => compareGroupKeys(a[0], b[0])));
  }, [sortedPhotos, displayCount, groupBy]);

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
    onLoadMore?.();
  };

  const canLoadMore = displayCount < sortedPhotos.length || hasMore;

  if (isLoading && photos.length === 0) {
    return (
      <SimpleGrid cols={{ base: 2, sm: 2, md: 3 }} spacing={10}>
        <PhotoSkeleton count={6} />
      </SimpleGrid>
    );
  }

  if (!isLoading && photos.length === 0) {
    return (
      <Center py="xl">
        <Stack align="center" gap="sm">
          <Text size="lg" fw={600} c="dimmed">
            No photos found
          </Text>
          <Text size="sm" c="dimmed">
            Try searching a different location or adjusting your filters.
          </Text>
        </Stack>
      </Center>
    );
  }

  const showGroupHeaders = groupBy !== 'none';

  return (
    <Stack gap="sm">
      {/* Header: count + group-by + sort */}
      <div className={classes.header}>
        <span className={classes.count}>
          {total.toLocaleString()} photo{total !== 1 ? 's' : ''}
        </span>
        <Group gap={6}>
          <NativeSelect
            size="xs"
            value={groupBy}
            onChange={(e) => setGroupBy(e.currentTarget.value as GroupBy)}
            leftSection={<IconLayoutList size={12} />}
            data={[
              { label: 'By decade', value: 'decade' },
              { label: 'By year', value: 'year' },
              { label: 'No grouping', value: 'none' },
            ]}
            classNames={{ input: classes.sortSelect }}
            aria-label="Group photos by"
          />
          <NativeSelect
            size="xs"
            value={sortBy}
            onChange={(e) => setSortBy(e.currentTarget.value as typeof sortBy)}
            leftSection={<IconArrowsSort size={12} />}
            data={[
              { label: 'Newest first', value: 'date-desc' },
              { label: 'Oldest first', value: 'date-asc' },
              { label: 'Scale (large)', value: 'scale-asc' },
              { label: 'Scale (small)', value: 'scale-desc' },
              { label: 'Name', value: 'name' },
            ]}
            classNames={{ input: classes.sortSelect }}
            aria-label="Sort photos"
          />
        </Group>
      </div>

      {/* Photo groups */}
      {Array.from(groupedPhotos.entries()).map(([groupKey, groupPhotos]) => (
        <div key={groupKey} className={classes.group}>
          {showGroupHeaders && (
            <div className={classes.decadeHeader}>
              <span className={classes.decadeLabel}>{groupKey}</span>
              <span className={classes.decadeCount}>{groupPhotos.length}</span>
            </div>
          )}
          <SimpleGrid cols={{ base: 2, sm: 2, md: 3 }} spacing={10}>
            {groupPhotos.map((photo) => (
              <PhotoCard
                key={`${photo.layerId}-${photo.objectId}`}
                photo={photo}
                onClick={onPhotoClick}
                onCompare={onPhotoCompare}
              />
            ))}
          </SimpleGrid>
        </div>
      ))}

      {/* Load more */}
      {canLoadMore && (
        <Center py="sm">
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            onClick={handleLoadMore}
            loading={isLoading}
          >
            Load more photos
          </Button>
        </Center>
      )}
    </Stack>
  );
}

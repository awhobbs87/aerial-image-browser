import { useState, useMemo } from 'react';
import { SimpleGrid, NativeSelect, Text, Button, Stack, Center } from '@mantine/core';
import { IconArrowsSort } from '@tabler/icons-react';
import type { EnhancedPhoto } from '@/types/photo';
import { useFilterStore } from '@/stores/filterStore';
import { PhotoCard } from './PhotoCard';
import { PhotoSkeleton } from './PhotoSkeleton';
import classes from './PhotoGrid.module.css';

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

  // Sort photos -- undated (dateFlown=0) always go to the end for date sorts
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

  // Group by decade
  const groupedPhotos = useMemo(() => {
    const groups: Map<string, EnhancedPhoto[]> = new Map();
    const displayed = sortedPhotos.slice(0, displayCount);

    for (const photo of displayed) {
      const decade = photo.year > 0 ? `${Math.floor(photo.year / 10) * 10}s` : 'Undated';
      if (!groups.has(decade)) groups.set(decade, []);
      groups.get(decade)!.push(photo);
    }

    // Sort groups: decades chronologically, "Undated" at the end
    return new Map(
      [...groups.entries()].sort((a, b) => {
        if (a[0] === 'Undated') return 1;
        if (b[0] === 'Undated') return -1;
        return a[0].localeCompare(b[0]);
      }),
    );
  }, [sortedPhotos, displayCount]);

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

  return (
    <Stack gap="sm">
      {/* Header: count + sort select */}
      <div className={classes.header}>
        <span className={classes.count}>
          {total.toLocaleString()} photo{total !== 1 ? 's' : ''}
        </span>
        <NativeSelect
          size="xs"
          value={sortBy}
          onChange={(e) => setSortBy(e.currentTarget.value as typeof sortBy)}
          leftSection={<IconArrowsSort size={12} />}
          data={[
            { label: 'Newest first', value: 'date-desc' },
            { label: 'Oldest first', value: 'date-asc' },
            { label: 'Scale', value: 'scale-desc' },
            { label: 'Name', value: 'name' },
          ]}
          classNames={{ input: classes.sortSelect }}
        />
      </div>

      {/* Grouped photo grid */}
      {Array.from(groupedPhotos.entries()).map(([decade, groupPhotos]) => (
        <div key={decade} className={classes.group}>
          <div className={classes.decadeHeader}>
            <span className={classes.decadeLabel}>{decade}</span>
            <span className={classes.decadeCount}>{groupPhotos.length}</span>
          </div>
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

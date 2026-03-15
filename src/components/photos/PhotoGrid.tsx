import { useState, useMemo } from 'react';
import {
  SimpleGrid,
  Group,
  Text,
  SegmentedControl,
  Button,
  Stack,
  Center,
} from '@mantine/core';
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

  // Sort photos
  const sortedPhotos = useMemo(() => {
    const sorted = [...photos];
    switch (sortBy) {
      case 'date-desc':
        sorted.sort((a, b) => (b.dateFlown || 0) - (a.dateFlown || 0));
        break;
      case 'date-asc':
        sorted.sort((a, b) => (a.dateFlown || 0) - (b.dateFlown || 0));
        break;
      case 'scale-asc':
        sorted.sort((a, b) => (a.scale || 0) - (b.scale || 0));
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
      const decade = photo.year ? `${Math.floor(photo.year / 10) * 10}s` : 'Unknown';
      if (!groups.has(decade)) groups.set(decade, []);
      groups.get(decade)!.push(photo);
    }

    return groups;
  }, [sortedPhotos, displayCount]);

  const handleLoadMore = () => {
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
    onLoadMore?.();
  };

  const canLoadMore = displayCount < sortedPhotos.length || hasMore;

  if (isLoading && photos.length === 0) {
    return (
      <div>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
          <PhotoSkeleton count={6} />
        </SimpleGrid>
      </div>
    );
  }

  if (!isLoading && photos.length === 0) {
    return (
      <Center py="xl">
        <Stack align="center" gap="sm">
          <Text size="lg" fw={600} c="dimmed">No photos found</Text>
          <Text size="sm" c="dimmed">Try searching a different location or adjusting your filters.</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      {/* Header with count and sort controls */}
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" c="dimmed">
          {total} photo{total !== 1 ? 's' : ''} found
        </Text>
        <SegmentedControl
          size="xs"
          value={sortBy}
          onChange={(value) => setSortBy(value as typeof sortBy)}
          data={[
            { label: 'Newest', value: 'date-desc' },
            { label: 'Oldest', value: 'date-asc' },
            { label: 'Scale', value: 'scale-desc' },
            { label: 'Name', value: 'name' },
          ]}
        />
      </Group>

      {/* Grouped photo grid */}
      {Array.from(groupedPhotos.entries()).map(([decade, groupPhotos]) => (
        <div key={decade}>
          <Text size="sm" fw={700} c="dimmed" mb="xs" className={classes.decadeHeader}>
            {decade}
          </Text>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
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
        <Center>
          <Button
            variant="light"
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

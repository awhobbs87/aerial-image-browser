import { useSearchStore } from '@/stores/searchStore';
import { usePhotos } from '@/hooks/usePhotos';
import { PhotoGrid } from '@/components/photos/PhotoGrid';
import { Stack, Text, Group, ActionIcon, Tooltip } from '@mantine/core';
import { IconAdjustments } from '@tabler/icons-react';
import { useUIStore } from '@/stores/uiStore';
import type { EnhancedPhoto } from '@/types/photo';

interface SearchResultsProps {
  onPhotoClick?: (photo: EnhancedPhoto) => void;
  onPhotoCompare?: (photo: EnhancedPhoto) => void;
}

export function SearchResults({ onPhotoClick, onPhotoCompare }: SearchResultsProps) {
  const { lat, lon, query } = useSearchStore();
  const { setFilterPanelOpen } = useUIStore();
  const hasLocation = lat !== null && lon !== null;

  const { data, isLoading, error } = usePhotos({ enabled: hasLocation });

  if (!hasLocation) {
    return (
      <Stack align="center" py="xl" gap="sm">
        <Text size="lg" fw={600} c="dimmed">
          Search for a location
        </Text>
        <Text size="sm" c="dimmed" ta="center">
          Enter a place name or click on the map to find aerial photos.
        </Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack align="center" py="xl" gap="sm">
        <Text size="lg" fw={600} c="red">
          Error loading photos
        </Text>
        <Text size="sm" c="dimmed">
          {error.message}
        </Text>
      </Stack>
    );
  }

  const photos = (data?.photos ?? []) as unknown as EnhancedPhoto[];
  const total = data?.count ?? 0;

  return (
    <Stack gap="md">
      {query && (
        <Group justify="space-between">
          <Text size="sm" fw={600}>
            Results for &ldquo;{query}&rdquo;
          </Text>
          <Tooltip label="Filters" withArrow>
            <ActionIcon
              variant="subtle"
              size="lg"
              onClick={() => setFilterPanelOpen(true)}
              aria-label="Open filters"
            >
              <IconAdjustments size={20} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
      <PhotoGrid
        photos={photos}
        isLoading={isLoading}
        total={total}
        onPhotoClick={onPhotoClick}
        onPhotoCompare={onPhotoCompare}
      />
    </Stack>
  );
}

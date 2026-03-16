import { useSearchStore } from '@/stores/searchStore';
import { useFilterStore } from '@/stores/filterStore';
import { usePhotos } from '@/hooks/usePhotos';
import { useMediaQuery } from '@mantine/hooks';
import { PhotoGrid } from '@/components/photos/PhotoGrid';
import { Stack, Text, Group, ActionIcon, Tooltip, Button } from '@mantine/core';
import { IconAdjustments, IconMapPin } from '@tabler/icons-react';
import { useUIStore } from '@/stores/uiStore';
import { SCALE_CATEGORIES } from '@/types/photo';
import type { EnhancedPhoto } from '@/types/photo';

interface SearchResultsProps {
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

export function SearchResults({ onPhotoClick, onPhotoCompare }: SearchResultsProps) {
  const { lat, lon, query } = useSearchStore();
  const { setFilterPanelOpen } = useUIStore();
  const { scaleCategories, toggleScaleCategory } = useFilterStore();
  const isDesktop = useMediaQuery('(min-width: 48em)');
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
  const loc = shortLocation(query);

  return (
    <Stack gap="xs">
      {/* Location header */}
      <Group justify="space-between" align="flex-start" wrap="nowrap" pt={4}>
        <Group gap={6} wrap="nowrap" align="flex-start" style={{ minWidth: 0 }}>
          <IconMapPin size={14} style={{ flexShrink: 0, marginTop: 2, opacity: 0.4 }} />
          <div style={{ minWidth: 0 }}>
            <Text size="sm" fw={600} truncate="end" lh={1.3}>
              {loc.primary}
            </Text>
            {loc.secondary && (
              <Text size="xs" c="dimmed" truncate="end" lh={1.3}>
                {loc.secondary}
              </Text>
            )}
          </div>
        </Group>
        {!isDesktop && (
          <Tooltip label="Filters" withArrow>
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={() => setFilterPanelOpen(true)}
              aria-label="Open filters"
            >
              <IconAdjustments size={16} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {/* Always-visible scale filter row */}
      <Group gap={4}>
        {SCALE_CATEGORIES.map((cat) => (
          <Button
            key={cat.key}
            size="compact-xs"
            variant={scaleCategories.includes(cat.key) ? 'filled' : 'light'}
            onClick={() => toggleScaleCategory(cat.key)}
          >
            {cat.label}
          </Button>
        ))}
      </Group>

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

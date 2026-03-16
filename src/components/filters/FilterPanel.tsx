import { Group, Stack, Text, NumberInput, Button, ActionIcon, Divider } from '@mantine/core';
import { IconRefresh, IconX } from '@tabler/icons-react';
import { useFilterStore } from '@/stores/filterStore';
import { SCALE_CATEGORIES } from '@/types/photo';
import { FilterPresets } from './FilterPresets';

interface FilterPanelProps {
  onClose?: () => void;
}

const LAYER_OPTIONS = [
  { id: 0, label: 'Aerial', color: 'green' },
  { id: 1, label: 'Ortho', color: 'blue' },
  { id: 2, label: 'Digital', color: 'orange' },
];

export function FilterPanel({ onClose }: FilterPanelProps) {
  const {
    layers,
    startYear,
    endYear,
    scaleCategories,
    toggleLayer,
    setDateRange,
    toggleScaleCategory,
    resetFilters,
  } = useFilterStore();

  const hasActiveFilters =
    layers.length < 3 || startYear !== null || endYear !== null || scaleCategories.length > 0;

  return (
    <Stack gap="xs" p="xs">
      {/* Header */}
      <Group justify="space-between" align="center">
        {hasActiveFilters ? (
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconRefresh size={12} />}
            onClick={resetFilters}
          >
            Reset filters
          </Button>
        ) : (
          <span />
        )}
        {onClose && (
          <ActionIcon size="sm" variant="subtle" onClick={onClose} aria-label="Close filters">
            <IconX size={14} />
          </ActionIcon>
        )}
      </Group>

      {/* Quick filter presets */}
      <Stack gap={4}>
        <Text size="xs" fw={600} tt="uppercase" c="dimmed">
          Quick filters
        </Text>
        <FilterPresets />
      </Stack>

      <Divider />

      {/* Image type */}
      <Stack gap={4}>
        <Text size="xs" fw={600} tt="uppercase" c="dimmed">
          Image type
        </Text>
        <Group gap="xs">
          {LAYER_OPTIONS.map((layer) => (
            <Button
              key={layer.id}
              size="xs"
              variant={layers.includes(layer.id) ? 'filled' : 'light'}
              color={layer.color}
              onClick={() => toggleLayer(layer.id)}
            >
              {layer.label}
            </Button>
          ))}
        </Group>
      </Stack>

      <Divider />

      {/* Date range */}
      <Stack gap={4}>
        <Text size="xs" fw={600} tt="uppercase" c="dimmed">
          Date range
        </Text>
        <Group gap="xs" grow>
          <NumberInput
            placeholder="From"
            value={startYear ?? ''}
            onChange={(val) => setDateRange(typeof val === 'number' ? val : null, endYear)}
            min={1946}
            max={2024}
            size="xs"
            hideControls
          />
          <NumberInput
            placeholder="To"
            value={endYear ?? ''}
            onChange={(val) => setDateRange(startYear, typeof val === 'number' ? val : null)}
            min={1946}
            max={2024}
            size="xs"
            hideControls
          />
        </Group>
      </Stack>

      <Divider />

      {/* Scale */}
      <Stack gap={4}>
        <Text size="xs" fw={600} tt="uppercase" c="dimmed">
          Scale
        </Text>
        <Group gap="xs">
          {SCALE_CATEGORIES.map((cat) => (
            <Button
              key={cat.key}
              size="xs"
              variant={scaleCategories.includes(cat.key) ? 'filled' : 'light'}
              onClick={() => toggleScaleCategory(cat.key)}
            >
              {cat.label}
            </Button>
          ))}
        </Group>
      </Stack>
    </Stack>
  );
}

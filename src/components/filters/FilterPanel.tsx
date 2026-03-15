import { Checkbox, Group, Stack, Text, NumberInput, Button, Chip, Divider, Paper } from '@mantine/core';
import { IconFilter, IconRefresh } from '@tabler/icons-react';
import { useFilterStore } from '@/stores/filterStore';
import { SCALE_CATEGORIES } from '@/types/photo';
import { FilterPresets } from './FilterPresets';
import classes from './FilterPanel.module.css';

interface FilterPanelProps {
  onClose?: () => void;
}

const LAYER_OPTIONS = [
  { id: 0, label: 'Aerial Photos', color: 'green' },
  { id: 1, label: 'Orthophotos', color: 'blue' },
  { id: 2, label: 'Digital Imagery', color: 'orange' },
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

  const hasActiveFilters = layers.length < 3 || startYear !== null || endYear !== null || scaleCategories.length > 0;

  return (
    <Paper className={classes.panel} p="md" radius="md">
      <Stack gap="md">
        <Group justify="space-between">
          <Group gap="xs">
            <IconFilter size={18} />
            <Text fw={600} size="sm">Filters</Text>
          </Group>
          {hasActiveFilters && (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconRefresh size={14} />}
              onClick={resetFilters}
            >
              Reset
            </Button>
          )}
        </Group>

        {/* Presets */}
        <FilterPresets />

        <Divider />

        {/* Layer toggles */}
        <Stack gap="xs">
          <Text size="xs" fw={600} tt="uppercase" c="dimmed">Image Type</Text>
          {LAYER_OPTIONS.map((layer) => (
            <Checkbox
              key={layer.id}
              label={layer.label}
              checked={layers.includes(layer.id)}
              onChange={() => toggleLayer(layer.id)}
              color={layer.color}
              size="sm"
            />
          ))}
        </Stack>

        <Divider />

        {/* Date range */}
        <Stack gap="xs">
          <Text size="xs" fw={600} tt="uppercase" c="dimmed">Date Range</Text>
          <Group grow>
            <NumberInput
              label="From"
              placeholder="1946"
              value={startYear ?? ''}
              onChange={(val) => setDateRange(typeof val === 'number' ? val : null, endYear)}
              min={1946}
              max={2024}
              size="sm"
            />
            <NumberInput
              label="To"
              placeholder="2024"
              value={endYear ?? ''}
              onChange={(val) => setDateRange(startYear, typeof val === 'number' ? val : null)}
              min={1946}
              max={2024}
              size="sm"
            />
          </Group>
        </Stack>

        <Divider />

        {/* Scale categories */}
        <Stack gap="xs">
          <Text size="xs" fw={600} tt="uppercase" c="dimmed">Scale</Text>
          <Group gap="xs">
            {SCALE_CATEGORIES.map((cat) => (
              <Chip
                key={cat.key}
                checked={scaleCategories.includes(cat.key)}
                onChange={() => toggleScaleCategory(cat.key)}
                size="xs"
                variant="outline"
              >
                {cat.label}
              </Chip>
            ))}
          </Group>
        </Stack>
      </Stack>
    </Paper>
  );
}

import { Button, Group, Text, Stack } from '@mantine/core';
import { useFilterStore } from '@/stores/filterStore';

interface Preset {
  label: string;
  startYear: number | null;
  endYear: number | null;
  layers: number[];
}

const PRESETS: Preset[] = [
  { label: 'All Photos', startYear: null, endYear: null, layers: [0, 1, 2] },
  { label: 'Pre-1960', startYear: null, endYear: 1960, layers: [0] },
  { label: '1960s-1980s', startYear: 1960, endYear: 1989, layers: [0, 1] },
  { label: 'Modern (1990+)', startYear: 1990, endYear: null, layers: [0, 1, 2] },
  { label: 'High Detail', startYear: null, endYear: null, layers: [2] },
];

export function FilterPresets() {
  const { setDateRange, setLayers, resetFilters } = useFilterStore();

  const applyPreset = (preset: Preset) => {
    resetFilters();
    setLayers(preset.layers);
    setDateRange(preset.startYear, preset.endYear);
  };

  return (
    <Stack gap="xs">
      <Text size="xs" fw={600} tt="uppercase" c="dimmed">Quick Filters</Text>
      <Group gap="xs">
        {PRESETS.map((preset) => (
          <Button
            key={preset.label}
            size="xs"
            variant="light"
            onClick={() => applyPreset(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </Group>
    </Stack>
  );
}

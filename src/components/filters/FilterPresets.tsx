import { Group, Button } from '@mantine/core';
import { useFilterStore } from '@/stores/filterStore';
import type { ScaleCategory } from '@/types/photo';

interface Preset {
  label: string;
  startYear: number | null;
  endYear: number | null;
  layers: number[];
  scaleCategories: ScaleCategory[];
}

const PRESETS: Preset[] = [
  { label: 'All photos', startYear: null, endYear: null, layers: [0, 1, 2], scaleCategories: [] },
  { label: 'Pre-1960', startYear: null, endYear: 1960, layers: [0], scaleCategories: [] },
  { label: '1960s-1980s', startYear: 1960, endYear: 1989, layers: [0, 1], scaleCategories: [] },
  { label: '1990+', startYear: 1990, endYear: null, layers: [0, 1, 2], scaleCategories: [] },
  {
    label: 'High detail',
    startYear: null,
    endYear: null,
    layers: [0, 1, 2],
    scaleCategories: ['very-detailed', 'detailed'],
  },
  {
    label: 'Standard scale',
    startYear: null,
    endYear: null,
    layers: [0, 1, 2],
    scaleCategories: ['standard'],
  },
  {
    label: 'Overview',
    startYear: null,
    endYear: null,
    layers: [0, 1, 2],
    scaleCategories: ['overview'],
  },
];

function arraysEqual(a: (number | string)[], b: (number | string)[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export function FilterPresets() {
  const {
    layers,
    startYear,
    endYear,
    scaleCategories,
    setDateRange,
    setLayers,
    setScaleCategories,
    resetFilters,
  } = useFilterStore();

  const applyPreset = (preset: Preset) => {
    resetFilters();
    setLayers(preset.layers);
    setDateRange(preset.startYear, preset.endYear);
    setScaleCategories(preset.scaleCategories);
  };

  const isActive = (preset: Preset): boolean =>
    preset.startYear === startYear &&
    preset.endYear === endYear &&
    arraysEqual(preset.layers, layers) &&
    arraysEqual(preset.scaleCategories, scaleCategories);

  return (
    <Group gap="xs">
      {PRESETS.map((preset) => (
        <Button
          key={preset.label}
          size="xs"
          variant={isActive(preset) ? 'filled' : 'light'}
          onClick={() => applyPreset(preset)}
        >
          {preset.label}
        </Button>
      ))}
    </Group>
  );
}

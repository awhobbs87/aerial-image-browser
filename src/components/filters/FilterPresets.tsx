import { useFilterStore } from '@/stores/filterStore';
import type { ScaleCategory } from '@/types/photo';
import { cn } from '@/lib/cn';

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
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => applyPreset(preset)}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold transition duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600',
            isActive(preset)
              ? 'bg-sky-600 text-white shadow-sm'
              : 'bg-slate-950/5 text-slate-600 hover:bg-slate-950/10 dark:bg-white/7 dark:text-slate-300 dark:hover:bg-white/12',
          )}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

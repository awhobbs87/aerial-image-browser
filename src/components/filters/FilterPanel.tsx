import { IconRefresh, IconX } from '@tabler/icons-react';
import { useFilterStore } from '@/stores/filterStore';
import { SCALE_CATEGORIES } from '@/types/photo';
import { FilterPresets } from './FilterPresets';
import { cn } from '@/lib/cn';

interface FilterPanelProps {
  onClose?: () => void;
}

const LAYER_OPTIONS = [
  { id: 0, label: 'Aerial', color: 'blue' },
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
    <div className="flex flex-col gap-4 p-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        {hasActiveFilters ? (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <IconRefresh size={12} />
            Reset filters
          </button>
        ) : (
          <span />
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <IconX size={14} />
          </button>
        )}
      </div>

      {/* Quick filter presets */}
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Quick filters
        </h3>
        <FilterPresets />
      </section>

      <div className="h-px bg-slate-950/10 dark:bg-white/10" />

      {/* Image type */}
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Image type
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {LAYER_OPTIONS.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => toggleLayer(layer.id)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold transition duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600',
                layers.includes(layer.id)
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-950/5 text-slate-600 hover:bg-slate-950/10 dark:bg-white/7 dark:text-slate-300 dark:hover:bg-white/12',
              )}
            >
              {layer.label}
            </button>
          ))}
        </div>
      </section>

      <div className="h-px bg-slate-950/10 dark:bg-white/10" />

      {/* Date range */}
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Date range
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="From"
            value={startYear ?? ''}
            onChange={(e) =>
              setDateRange(e.currentTarget.value ? Number(e.currentTarget.value) : null, endYear)
            }
            min={1946}
            max={2024}
            className="h-9 rounded-xl border border-slate-950/10 bg-white/80 px-3 text-sm text-slate-950 outline-none transition focus:border-sky-600/50 focus:ring-3 focus:ring-sky-600/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-50"
          />
          <input
            type="number"
            placeholder="To"
            value={endYear ?? ''}
            onChange={(e) =>
              setDateRange(startYear, e.currentTarget.value ? Number(e.currentTarget.value) : null)
            }
            min={1946}
            max={2024}
            className="h-9 rounded-xl border border-slate-950/10 bg-white/80 px-3 text-sm text-slate-950 outline-none transition focus:border-sky-600/50 focus:ring-3 focus:ring-sky-600/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-50"
          />
        </div>
      </section>

      <div className="h-px bg-slate-950/10 dark:bg-white/10" />

      {/* Scale */}
      <section className="flex flex-col gap-2">
        <h3 className="text-[11px] font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Scale
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {SCALE_CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => toggleScaleCategory(cat.key)}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold transition duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600',
                scaleCategories.includes(cat.key)
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-slate-950/5 text-slate-600 hover:bg-slate-950/10 dark:bg-white/7 dark:text-slate-300 dark:hover:bg-white/12',
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

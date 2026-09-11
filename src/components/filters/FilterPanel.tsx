import { IconCheck, IconRefresh, IconX } from '@tabler/icons-react';
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

const SCALE_LABELS = {
  'very-detailed': ['Very detailed', 'Up to 1:5,000'],
  detailed: ['Detailed', '1:5,000-15,000'],
  standard: ['Standard', '1:15,000-40,000'],
  overview: ['Overview', 'Over 1:40,000'],
} as const;

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
        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Quick filters
        </h3>
        <FilterPresets />
      </section>

      <div className="h-px bg-slate-950/10 dark:bg-white/10" />

      {/* Image type */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Image type
        </h3>
        <div className="grid grid-cols-3 gap-1.5">
          {LAYER_OPTIONS.map((layer) => (
            <button
              key={layer.id}
              type="button"
              onClick={() => toggleLayer(layer.id)}
              aria-pressed={layers.includes(layer.id)}
              className={cn(
                'rounded-xl border px-2.5 py-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
                layers.includes(layer.id)
                  ? 'border-amber-500/45 bg-amber-400/13 text-slate-950 dark:border-amber-300/40 dark:bg-amber-300/20 dark:text-white'
                  : 'border-slate-950/8 bg-white/55 text-slate-600 hover:border-slate-950/16 hover:bg-white dark:border-border dark:bg-card dark:text-slate-300 dark:hover:border-white/16 dark:hover:bg-white/7',
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
        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Date range
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="From"
            aria-label="From year"
            value={startYear ?? ''}
            onChange={(e) =>
              setDateRange(e.currentTarget.value ? Number(e.currentTarget.value) : null, endYear)
            }
            min={1946}
            max={new Date().getFullYear()}
            className="h-11 rounded-xl border border-slate-950/10 bg-white/72 px-3 text-sm text-slate-950 outline-none focus:border-amber-500/50 focus:ring-3 focus:ring-amber-500/10 dark:border-border dark:bg-card dark:text-slate-50"
          />
          <input
            type="number"
            placeholder="To"
            aria-label="To year"
            value={endYear ?? ''}
            onChange={(e) =>
              setDateRange(startYear, e.currentTarget.value ? Number(e.currentTarget.value) : null)
            }
            min={1946}
            max={new Date().getFullYear()}
            className="h-11 rounded-xl border border-slate-950/10 bg-white/72 px-3 text-sm text-slate-950 outline-none focus:border-amber-500/50 focus:ring-3 focus:ring-amber-500/10 dark:border-border dark:bg-card dark:text-slate-50"
          />
        </div>
      </section>

      <div className="h-px bg-slate-950/10 dark:bg-white/10" />

      {/* Scale */}
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
          Scale
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          {SCALE_CATEGORIES.map((cat) => {
            const selected = scaleCategories.includes(cat.key);
            const [title, range] = SCALE_LABELS[cat.key];

            return (
              <button
                key={cat.key}
                type="button"
                aria-label={cat.label}
                aria-pressed={selected}
                onClick={() => toggleScaleCategory(cat.key)}
                className={cn(
                  'relative flex min-h-13 min-w-0 flex-col items-start justify-center rounded-xl border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500',
                  selected
                    ? 'border-amber-500/55 bg-amber-400/13 text-slate-950 dark:border-amber-300/70 dark:bg-amber-300/20 dark:text-white'
                    : 'border-slate-950/8 bg-white/55 text-slate-700 hover:border-slate-950/16 hover:bg-white dark:border-border dark:bg-card dark:text-slate-200 dark:hover:border-white/16 dark:hover:bg-white/7',
                )}
              >
                <span className="max-w-[calc(100%-1rem)] truncate text-xs font-bold">{title}</span>
                <span className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                  {range}
                </span>
                {selected && (
                  <IconCheck
                    size={14}
                    stroke={2.4}
                    className="absolute top-2 right-2 text-amber-600 dark:text-amber-300"
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}

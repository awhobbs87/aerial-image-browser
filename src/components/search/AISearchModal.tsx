import { useState, useCallback } from 'react';
import { IconSparkles, IconSearch, IconMapPin, IconCalendar, IconZoom } from '@tabler/icons-react';
import { api } from '@/lib/api-client';
import { geocodeSearch } from '@/lib/geocoding';
import { useSearchStore } from '@/stores/searchStore';
import { useFilterStore } from '@/stores/filterStore';
import { Dialog } from '@/components/ui/Dialog';

interface AISearchModalProps {
  opened: boolean;
  onClose: () => void;
  onSearch?: (lat: number, lon: number, label: string) => void;
}

interface ParsedQuery {
  location: string;
  startYear?: number;
  endYear?: number;
  resolution?: string;
  imageType?: string;
  additionalContext?: string;
}

export function AISearchModal({ opened, onClose, onSearch }: AISearchModalProps) {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsed, setParsed] = useState<ParsedQuery | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { setQuery: setSearchQuery, setLocation } = useSearchStore();
  const { setDateRange, setLayers } = useFilterStore();

  const handleSubmit = useCallback(async () => {
    if (!query.trim()) return;

    setIsProcessing(true);
    setError(null);
    setParsed(null);

    try {
      const parseResponse = await api.post<{ success: boolean; data: ParsedQuery }>(
        '/api/ai/parse-search',
        { query },
      );

      if (!parseResponse.success) {
        setError('Failed to parse search query');
        return;
      }

      const parsedData = parseResponse.data;
      setParsed(parsedData);
      const geoResults = await geocodeSearch(parsedData.location, 3);

      if (geoResults.length === 0) {
        setError(`Could not find location: "${parsedData.location}"`);
        return;
      }

      const topResult = geoResults[0];

      if (parsedData.startYear || parsedData.endYear) {
        setDateRange(parsedData.startYear ?? null, parsedData.endYear ?? null);
      }

      if (parsedData.imageType) {
        const layerMap: Record<string, number[]> = {
          aerial: [0],
          ortho: [1],
          digital: [2],
        };
        if (layerMap[parsedData.imageType]) setLayers(layerMap[parsedData.imageType]);
      }

      setSearchQuery(parsedData.location);
      setLocation(topResult.lat, topResult.lon);
      onSearch?.(topResult.lat, topResult.lon, parsedData.location);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsProcessing(false);
    }
  }, [query, setSearchQuery, setLocation, setDateRange, setLayers, onSearch, onClose]);

  return (
    <Dialog
      open={opened}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={
        <span className="inline-flex items-center gap-2">
          <IconSparkles size={18} />
          AI Search
        </span>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Describe what you're looking for in natural language.
        </p>

        <div className="relative">
          <IconSearch
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isProcessing) handleSubmit();
            }}
            placeholder="e.g., Find aerial photos of Sandy Bay from the 1950s"
            className="h-11 w-full rounded-2xl border border-slate-950/10 bg-white pr-14 pl-10 text-sm outline-none transition focus:border-sky-600/50 focus:ring-3 focus:ring-sky-600/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-50"
            autoFocus
          />
          <span className="absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-bold text-slate-400">
            {isProcessing ? '...' : 'Enter'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Try:</span>
          {[
            'Hobart CBD in the 1940s',
            'High resolution photos of Launceston',
            'Port Arthur historical aerials',
          ].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuery(suggestion)}
              className="rounded-full bg-sky-600/10 px-2 py-1 text-xs font-bold text-sky-700 transition hover:bg-sky-600/15 dark:text-sky-300"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {parsed && (
          <div className="rounded-2xl border border-slate-950/10 bg-slate-950/[0.02] p-3 dark:border-white/10 dark:bg-white/5">
            <p className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Parsed query
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-700 dark:text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                <IconMapPin size={14} />
                {parsed.location}
              </span>
              {(parsed.startYear || parsed.endYear) && (
                <span className="inline-flex items-center gap-1.5">
                  <IconCalendar size={14} />
                  {parsed.startYear || '...'} - {parsed.endYear || '...'}
                </span>
              )}
              {parsed.imageType && (
                <span className="rounded-full bg-slate-950/5 px-2 py-0.5 text-xs font-bold dark:bg-white/10">
                  {parsed.imageType}
                </span>
              )}
              {parsed.resolution && (
                <span className="inline-flex items-center gap-1.5">
                  <IconZoom size={14} />
                  {parsed.resolution} res
                </span>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!query.trim() || isProcessing}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 text-sm font-bold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
        >
          {isProcessing ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <IconSparkles size={16} />
          )}
          Search with AI
        </button>
      </div>
    </Dialog>
  );
}

import { useState, useCallback } from 'react';
import {
  CalendarBlankIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  SparkleIcon,
  TrendUpIcon,
} from '@phosphor-icons/react';
import { Button } from '@cloudflare/kumo/components/button';
import { InputGroup } from '@cloudflare/kumo/components/input-group';
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
          <SparkleIcon size={18} />
          AI Search
        </span>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Describe what you're looking for in natural language.
        </p>

        <InputGroup size="lg">
          <InputGroup.Addon>
            <MagnifyingGlassIcon size={18} className="text-kumo-subtle" />
          </InputGroup.Addon>
          <InputGroup.Input
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isProcessing) handleSubmit();
            }}
            placeholder="e.g., Find aerial photos of Sandy Bay from the 1950s"
            aria-label="Describe the aerial photography to find"
            autoFocus
          />
          <InputGroup.Suffix className="text-[10px] font-bold text-kumo-subtle">
            {isProcessing ? '...' : 'Enter'}
          </InputGroup.Suffix>
        </InputGroup>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400">Try:</span>
          {[
            'Hobart CBD in the 1940s',
            'High resolution photos of Launceston',
            'Port Arthur historical aerials',
          ].map((suggestion) => (
            <Button
              key={suggestion}
              type="button"
              onClick={() => setQuery(suggestion)}
              variant="ghost"
              size="sm"
              className="rounded-full text-kumo-accent"
            >
              {suggestion}
            </Button>
          ))}
        </div>

        {parsed && (
          <div className="rounded-2xl border border-slate-950/10 bg-slate-950/[0.02] p-3 dark:border-border dark:bg-card">
            <p className="mb-2 text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400">
              Parsed query
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-slate-700 dark:text-slate-200">
              <span className="inline-flex items-center gap-1.5">
                <MapPinIcon size={14} />
                {parsed.location}
              </span>
              {(parsed.startYear || parsed.endYear) && (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarBlankIcon size={14} />
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
                  <TrendUpIcon size={14} />
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

        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!query.trim() || isProcessing}
          loading={isProcessing}
          icon={SparkleIcon}
          variant="primary"
          size="lg"
          className="w-full"
        >
          Search with AI
        </Button>
      </div>
    </Dialog>
  );
}

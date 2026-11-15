import { useState } from 'react';
import { Button } from '@cloudflare/kumo/components/button';
import { Input } from '@cloudflare/kumo/components/input';
import { Select } from '@cloudflare/kumo/components/select';
import { api } from '@/lib/api-client';
import type { ParsedSearchQuery } from '@/lib/ai';
import { geocodeSearch, type GeocodingResult } from '@/lib/geocoding';
import { geocodingBounds, placeTypeLabel } from '@/lib/search-extent';
import { addRecentSearch } from '@/lib/recent-searches';
import { useSearchStore } from '@/stores/searchStore';
import { useFilterStore } from '@/stores/filterStore';
import { Dialog } from '@/components/ui/Dialog';
interface Props {
  opened: boolean;
  onClose: () => void;
  onSearch?: (lat: number, lon: number, label: string) => void;
}
export function AISearchModal({ opened, onClose, onSearch }: Props) {
  const [query, setQuery] = useState('');
  const [parsed, setParsed] = useState<ParsedSearchQuery | null>(null);
  const [locations, setLocations] = useState<GeocodingResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const update = (patch: Partial<ParsedSearchQuery>) => {
    setParsed((p) => (p ? { ...p, ...patch } : p));
    setLocations([]);
    setError('');
  };
  const parse = async () => {
    setLoading(true);
    setError('');
    setParsed(null);
    setLocations([]);
    try {
      const response = await api.post<{ success: boolean; data: ParsedSearchQuery }>(
        '/api/ai/parse-search',
        { query },
      );
      setParsed(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search unavailable');
    } finally {
      setLoading(false);
    }
  };
  const findLocations = async () => {
    if (!parsed) return;
    if (
      [parsed.startYear, parsed.endYear].some(
        (year) =>
          year !== undefined &&
          (!Number.isInteger(year) || year < 1900 || year > new Date().getFullYear()),
      ) ||
      (parsed.startYear && parsed.endYear && parsed.startYear > parsed.endYear)
    ) {
      setError('Enter a valid year range, with the start before the end.');
      return;
    }
    setLoading(true);
    setError('');
    setLocations([]);
    try {
      const matches = await geocodeSearch(parsed.location, 7);
      setLocations(matches);
      if (!matches.length)
        setError('No matching Tasmanian locations. Edit the location and try again.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Location search unavailable');
    } finally {
      setLoading(false);
    }
  };
  const apply = (place: GeocodingResult) => {
    if (!parsed) return;
    const filters = useFilterStore.getState();
    filters.resetFilters();
    filters.setDateRange(parsed.startYear ?? null, parsed.endYear ?? null);
    if (parsed.imageType)
      filters.setLayers([{ aerial: 0, ortho: 1, digital: 2 }[parsed.imageType]]);
    if (parsed.resolution)
      filters.setScaleCategories(
        parsed.resolution === 'high'
          ? ['very-detailed', 'detailed']
          : parsed.resolution === 'medium'
            ? ['standard']
            : ['overview'],
      );
    const search = useSearchStore.getState();
    search.setLocation(place.lat, place.lon);
    search.setFrameBounds(geocodingBounds(place.boundingBox));
    search.setQuery(place.displayName);
    addRecentSearch({ label: place.displayName, lat: place.lat, lon: place.lon });
    onSearch?.(place.lat, place.lon, place.displayName);
    onClose();
  };
  return (
    <Dialog
      open={opened}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="AI search"
    >
      <div className="max-h-[70dvh] space-y-4 overflow-y-auto p-4">
        <p className="text-sm text-muted-foreground">
          Describe a place and time, then review the interpretation before searching.
        </p>
        <Input
          aria-label="Describe the aerial photography to find"
          placeholder="Sandy Bay in the 1950s"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setParsed(null);
            setLocations([]);
          }}
        />
        <Button
          loading={loading && !parsed}
          disabled={loading || !query.trim()}
          onClick={() => void parse()}
        >
          Interpret search
        </Button>
        {parsed && (
          <section className="space-y-3" aria-label="Review search interpretation">
            <p className="text-sm">
              {parsed.parser === 'fallback'
                ? 'AI was unavailable; review this basic interpretation.'
                : 'Review and edit your search.'}{' '}
              Applying it replaces previous filters.
            </p>
            <Input
              aria-label="Interpreted location"
              value={parsed.location}
              onChange={(e) => update({ location: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                aria-label="From year"
                placeholder="From year"
                min={1900}
                max={new Date().getFullYear()}
                value={parsed.startYear ?? ''}
                onChange={(e) =>
                  update({ startYear: e.target.value ? Number(e.target.value) : undefined })
                }
              />
              <Input
                type="number"
                aria-label="To year"
                placeholder="To year"
                min={1900}
                max={new Date().getFullYear()}
                value={parsed.endYear ?? ''}
                onChange={(e) =>
                  update({ endYear: e.target.value ? Number(e.target.value) : undefined })
                }
              />
            </div>
            <Select
              label="Imagery"
              value={parsed.imageType || 'all'}
              items={{
                all: 'All imagery',
                aerial: 'Aerial',
                ortho: 'Orthophoto',
                digital: 'Digital',
              }}
              onValueChange={(value) =>
                update({
                  imageType:
                    value === 'all' ? undefined : (value as ParsedSearchQuery['imageType']),
                })
              }
            />
            <Select
              label="Scale preference"
              value={parsed.resolution || 'any'}
              items={{
                any: 'Any scale',
                high: 'Detailed (up to 1:15,000)',
                medium: 'Standard (1:15,001–40,000)',
                low: 'Overview (over 1:40,000)',
              }}
              onValueChange={(value) =>
                update({
                  resolution:
                    value === 'any' ? undefined : (value as ParsedSearchQuery['resolution']),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Detail uses source photo scale, not measured scan resolution. Unknown dates and scales
              remain included; change this in Filters.
            </p>
            <Button
              disabled={loading || !parsed.location.trim()}
              loading={loading}
              onClick={() => void findLocations()}
            >
              Find matching locations
            </Button>
            {!!locations.length && (
              <p className="text-sm font-semibold">Choose the location to apply this search:</p>
            )}
            {locations.map((place) => (
              <Button
                className="h-auto min-h-11 w-full justify-start whitespace-normal text-left"
                key={place.placeId}
                variant="secondary"
                onClick={() => apply(place)}
              >
                {place.displayName} · {placeTypeLabel(place.type)}
              </Button>
            ))}
          </section>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}

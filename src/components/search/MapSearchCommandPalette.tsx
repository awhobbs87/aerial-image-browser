import { getRecentSearches, addRecentSearch, clearRecentSearches } from '@/lib/recent-searches';
import { Button } from '@cloudflare/kumo/components/button';
import { useFilterStore } from '@/stores/filterStore';
import { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlassIcon, MapPinIcon } from '@phosphor-icons/react';
import { CommandPalette } from '@cloudflare/kumo/components/command-palette';
import { LayerDialog } from '@cloudflare/kumo/components/layer-dialog';
import { Toolbar } from '@cloudflare/kumo/components/toolbar';
import { geocodeSearch, type GeocodingResult } from '@/lib/geocoding';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchStore } from '@/stores/searchStore';

interface LocationCommand {
  id: string;
  title: string;
  description: string;
  recent?: boolean;
  lat: number;
  lon: number;
}

interface MapSearchCommandPaletteProps {
  disabled?: boolean;
  onLocationSelect?: (lat: number, lon: number, label: string) => void;
}

const POPULAR_LOCATIONS: LocationCommand[] = [
  {
    id: 'popular-hobart',
    title: 'Hobart',
    description: 'Tasmania',
    lat: -42.8821,
    lon: 147.3272,
  },
  {
    id: 'popular-launceston',
    title: 'Launceston',
    description: 'Tasmania',
    lat: -41.4332,
    lon: 147.1441,
  },
  {
    id: 'popular-port-arthur',
    title: 'Port Arthur',
    description: 'Tasman Peninsula',
    lat: -43.147,
    lon: 147.851,
  },
];

function toCommand(result: GeocodingResult): LocationCommand {
  const [title, ...rest] = result.displayName.split(',');
  return {
    id: result.placeId,
    title: title?.trim() || result.displayName,
    description: rest.slice(0, 2).join(',').trim() || 'Tasmania',
    lat: result.lat,
    lon: result.lon,
  };
}

export function MapSearchCommandPalette({
  onLocationSelect,
  disabled = false,
}: MapSearchCommandPaletteProps) {
  const currentQuery = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const setLocation = useSearchStore((state) => state.setLocation);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<LocationCommand[]>([]);
  const [recents, setRecents] = useState<LocationCommand[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 220);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 47.99em)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (!open || trimmed.length < 2) {
      return undefined;
    }

    const controller = new AbortController();
    let active = true;
    geocodeSearch(trimmed, 7, controller.signal)
      .then((items) => {
        if (active) setResults(items.map(toCommand));
      })
      .catch((err: unknown) => {
        if (active) {
          setResults([]);
          setError(err instanceof Error ? err.message : 'Search unavailable. Please try again.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedSearch, open]);

  const items = useMemo(
    () =>
      search.trim().length >= 2
        ? search === debouncedSearch
          ? results
          : []
        : [...recents, ...POPULAR_LOCATIONS],
    [results, search, debouncedSearch, recents],
  );

  const selectLocation = (item: LocationCommand) => {
    const label = item.description ? `${item.title}, ${item.description}` : item.title;
    addRecentSearch({ label, lat: item.lat, lon: item.lon });
    useFilterStore.getState().resetFilters();
    setQuery(label);
    setLocation(item.lat, item.lon);
    onLocationSelect?.(item.lat, item.lon, label);
    setOpen(false);
    setSearch('');
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearch('');
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setResults([]);
    setError('');
    setLoading(value.trim().length >= 2);
  };

  const searchContent = (
    <>
      <CommandPalette.Input
        placeholder="Search addresses, towns and landmarks..."
        aria-label="Search Tasmania locations"
        autoComplete="off"
        spellCheck={false}
      />
      <CommandPalette.List className="max-h-[min(55dvh,24rem)] overscroll-contain">
        {search.trim().length < 2 && recents.length > 0 && (
          <p className="px-2 py-2 text-xs text-muted-foreground">
            Recent searches and popular places
          </p>
        )}
        {loading ? (
          <CommandPalette.Loading>Searching Tasmania...</CommandPalette.Loading>
        ) : (
          <CommandPalette.Results>
            {(item: LocationCommand) => (
              <CommandPalette.ResultItem
                key={item.id}
                value={item}
                title={item.title}
                description={item.recent ? 'Recent search' : item.description}
                icon={<MapPinIcon size={18} />}
                onClick={() => selectLocation(item)}
                showArrow={false}
              />
            )}
          </CommandPalette.Results>
        )}
        {!loading && (
          <CommandPalette.Empty>
            {search.trim().length < 2
              ? 'Start typing to search Tasmania'
              : error || 'No matching Tasmanian locations. Try a street name and suburb.'}
          </CommandPalette.Empty>
        )}
      </CommandPalette.List>
    </>
  );

  const searchFooter = (includeClose: boolean) => (
    <div className="flex items-center justify-between gap-2 border-t border-border bg-card p-2">
      <span className="text-xs text-muted-foreground">Addresses and places © LIST Tasmania</span>
      {recents.length > 0 && (
        <Button
          variant="ghost"
          onClick={() => {
            clearRecentSearches();
            setRecents([]);
          }}
        >
          Clear recent searches
        </Button>
      )}
      {includeClose && (
        <Button variant="secondary" onClick={() => handleOpenChange(false)}>
          Close search
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Toolbar.Button
        disabled={disabled}
        icon={MagnifyingGlassIcon}
        onClick={() => {
          setRecents(
            getRecentSearches().map((r, i) => ({
              id: `recent-${i}`,
              title: r.label,
              description: '',
              lat: r.lat,
              lon: r.lon,
              recent: true,
            })),
          );
          setOpen(true);
        }}
        aria-label="Search for a location"
        className="min-w-0 flex-1 justify-start"
      >
        <span className="truncate">{currentQuery || 'Search Tasmania...'}</span>
      </Toolbar.Button>

      {isMobile ? (
        <LayerDialog.Root open={open} onOpenChange={handleOpenChange}>
          <LayerDialog.Content closeLabel="Close search">
            <LayerDialog.Title>Search Tasmania</LayerDialog.Title>
            <LayerDialog.Description>Find an address, town or landmark.</LayerDialog.Description>
            <LayerDialog.Body>
              <CommandPalette.Panel
                items={items}
                value={search}
                onValueChange={handleSearchChange}
                itemToStringValue={(item) => item.title}
                filter={() => true}
                onSelect={(item) => selectLocation(item)}
                getSelectableItems={(paletteItems) => paletteItems}
                className="overflow-hidden rounded-lg border border-kumo-line bg-kumo-base"
              >
                {searchContent}
                {searchFooter(false)}
              </CommandPalette.Panel>
            </LayerDialog.Body>
          </LayerDialog.Content>
        </LayerDialog.Root>
      ) : (
        <CommandPalette.Root
          open={open}
          onOpenChange={handleOpenChange}
          items={items}
          value={search}
          onValueChange={handleSearchChange}
          itemToStringValue={(item) => item.title}
          filter={() => true}
          onSelect={(item) => selectLocation(item)}
          getSelectableItems={(paletteItems) => paletteItems}
        >
          {searchContent}
          {searchFooter(true)}
        </CommandPalette.Root>
      )}
    </>
  );
}

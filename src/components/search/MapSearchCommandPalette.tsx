import { useEffect, useMemo, useState } from 'react';
import { MagnifyingGlassIcon, MapPinIcon } from '@phosphor-icons/react';
import { CommandPalette } from '@cloudflare/kumo/components/command-palette';
import { Toolbar } from '@cloudflare/kumo/components/toolbar';
import { geocodeSearch, type GeocodingResult } from '@/lib/geocoding';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useSearchStore } from '@/stores/searchStore';

interface LocationCommand {
  id: string;
  title: string;
  description: string;
  lat: number;
  lon: number;
}

interface MapSearchCommandPaletteProps {
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

export function MapSearchCommandPalette({ onLocationSelect }: MapSearchCommandPaletteProps) {
  const currentQuery = useSearchStore((state) => state.query);
  const setQuery = useSearchStore((state) => state.setQuery);
  const setLocation = useSearchStore((state) => state.setLocation);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<LocationCommand[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 220);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    if (trimmed.length < 2) {
      return undefined;
    }

    let active = true;
    geocodeSearch(trimmed, 7)
      .then((items) => {
        if (active) setResults(items.map(toCommand));
      })
      .catch(() => {
        if (active) setResults([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch]);

  const items = useMemo(
    () => (search.trim().length >= 2 ? results : POPULAR_LOCATIONS),
    [results, search],
  );

  const selectLocation = (item: LocationCommand) => {
    const label = item.description ? `${item.title}, ${item.description}` : item.title;
    setQuery(label);
    setLocation(item.lat, item.lon);
    onLocationSelect?.(item.lat, item.lon, label);
    setOpen(false);
    setSearch('');
  };

  return (
    <>
      <Toolbar.Button
        icon={MagnifyingGlassIcon}
        onClick={() => setOpen(true)}
        aria-label="Search for a location"
        className="min-w-0 flex-1 justify-start"
      >
        <span className="truncate">{currentQuery || 'Search Tasmania...'}</span>
      </Toolbar.Button>

      <CommandPalette.Root
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            setSearch('');
            setLoading(false);
          }
        }}
        items={items}
        value={search}
        onValueChange={(value) => {
          setSearch(value);
          setLoading(value.trim().length >= 2);
        }}
        itemToStringValue={(item) => item.title}
        filter={() => true}
        onSelect={(item) => selectLocation(item)}
        getSelectableItems={(paletteItems) => paletteItems}
      >
        <CommandPalette.Input
          placeholder="Search towns, suburbs and landmarks..."
          aria-label="Search Tasmania locations"
          autoComplete="off"
          spellCheck={false}
        />
        <CommandPalette.List>
          {loading ? (
            <CommandPalette.Loading>Searching Tasmania...</CommandPalette.Loading>
          ) : (
            <CommandPalette.Results>
              {(item: LocationCommand) => (
                <CommandPalette.ResultItem
                  key={item.id}
                  value={item}
                  title={item.title}
                  description={item.description}
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
                : 'No matching locations found'}
            </CommandPalette.Empty>
          )}
        </CommandPalette.List>
        <CommandPalette.Footer />
      </CommandPalette.Root>
    </>
  );
}

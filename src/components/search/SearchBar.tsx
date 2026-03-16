import { useState, useEffect, useCallback, useRef } from 'react';
import { TextInput, Paper, Text, Group, Stack, ActionIcon, Loader } from '@mantine/core';
import { useDebouncedValue, useClickOutside } from '@mantine/hooks';
import {
  IconSearch,
  IconMapPin,
  IconX,
  IconCurrentLocation,
  IconHistory,
  IconTrash,
} from '@tabler/icons-react';
import { geocodeSearch, type GeocodingResult } from '@/lib/geocoding';
import { useSearchStore } from '@/stores/searchStore';
import { useUIStore } from '@/stores/uiStore';
import classes from './SearchBar.module.css';

interface SearchBarProps {
  onLocationSelect?: (lat: number, lon: number, label: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

const POPULAR_LOCATIONS = [
  { label: 'Hobart', lat: -42.8821, lon: 147.3272 },
  { label: 'Launceston', lat: -41.4332, lon: 147.1441 },
];

interface RecentSearch {
  label: string;
  lat: number;
  lon: number;
}

const RECENT_KEY = 'tas-aerial-recent-searches';
const MAX_RECENT = 5;

function getRecentSearches(): RecentSearch[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentSearch(item: RecentSearch) {
  const existing = getRecentSearches().filter(
    (r) => !(Math.abs(r.lat - item.lat) < 0.001 && Math.abs(r.lon - item.lon) < 0.001),
  );
  const updated = [item, ...existing].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

export function SearchBar({
  onLocationSelect,
  placeholder = 'Search Tasmania...',
  size = 'lg',
}: SearchBarProps) {
  const { query, setQuery, setLocation } = useSearchStore();
  const { searchFocused, setSearchFocused } = useUIStore();

  const [inputValue, setInputValue] = useState(query);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const [debouncedValue] = useDebouncedValue(inputValue, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  const wrapperRef = useClickOutside<HTMLDivElement>(() => {
    setSearchFocused(false);
    setActiveIndex(-1);
  });

  // Load recents when dropdown opens
  useEffect(() => {
    if (searchFocused) setRecents(getRecentSearches());
  }, [searchFocused]);

  // Geocode on debounced input
  useEffect(() => {
    if (!debouncedValue || debouncedValue.length < 2) {
      const id = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(id);
    }
    let cancelled = false;
    setIsSearching(true);
    geocodeSearch(debouncedValue, 5)
      .then((r) => {
        if (!cancelled) {
          setResults(r);
          setActiveIndex(-1);
        }
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedValue]);

  const handleSelect = useCallback(
    (lat: number, lon: number, label: string) => {
      setQuery(label);
      setInputValue(label);
      setLocation(lat, lon);
      setResults([]);
      setSearchFocused(false);
      setActiveIndex(-1);
      addRecentSearch({ label, lat, lon });
      onLocationSelect?.(lat, lon, label);
    },
    [setQuery, setLocation, setSearchFocused, onLocationSelect],
  );

  const handleClearRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecents([]);
  };

  const showResults = searchFocused && results.length > 0;
  const showIdle = searchFocused && inputValue.length === 0;
  const showDropdown = showResults || showIdle;

  // Build flat list of selectable items for keyboard nav
  const idleItems: { type: 'recent' | 'popular'; label: string; lat: number; lon: number }[] = [];
  if (showIdle) {
    recents.forEach((r) => idleItems.push({ type: 'recent', ...r }));
    POPULAR_LOCATIONS.forEach((p) => idleItems.push({ type: 'popular', ...p }));
  }

  const totalItems = showResults ? results.length : idleItems.length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((p) => (p < totalItems - 1 ? p + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((p) => (p > 0 ? p - 1 : totalItems - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      if (showResults) {
        const r = results[activeIndex];
        if (r) handleSelect(r.lat, r.lon, r.displayName);
      } else if (showIdle) {
        const item = idleItems[activeIndex];
        if (item) handleSelect(item.lat, item.lon, item.label);
      }
    } else if (e.key === 'Escape') {
      setSearchFocused(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setInputValue('');
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  // Track the flat index for idle items
  let idleIdx = 0;

  return (
    <div ref={wrapperRef} className={classes.wrapper}>
      <TextInput
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.currentTarget.value)}
        onFocus={() => setSearchFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        size={size}
        leftSection={<IconSearch size={18} />}
        rightSection={
          isSearching ? (
            <Loader size="xs" />
          ) : inputValue ? (
            <ActionIcon variant="subtle" size="sm" onClick={handleClear} aria-label="Clear search">
              <IconX size={14} />
            </ActionIcon>
          ) : null
        }
        classNames={{ input: classes.input }}
      />

      {showDropdown && (
        <Paper className={classes.dropdown} shadow="lg" withBorder>
          {/* Geocode results */}
          {showResults && (
            <Stack gap={0}>
              {results.map((result, i) => (
                <button
                  key={result.placeId}
                  type="button"
                  className={`${classes.result} ${activeIndex === i ? classes.active : ''}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(result.lat, result.lon, result.displayName);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <Group gap={6} wrap="nowrap">
                    <IconMapPin size={13} style={{ flexShrink: 0, opacity: 0.4 }} />
                    <div style={{ minWidth: 0 }}>
                      <Text size="xs" fw={500} truncate="end">
                        {result.displayName.split(',')[0]}
                      </Text>
                      <Text size="xs" c="dimmed" truncate="end" lh={1.2}>
                        {result.displayName.split(',').slice(1, 3).join(',').trim()}
                      </Text>
                    </div>
                  </Group>
                </button>
              ))}
            </Stack>
          )}

          {/* Idle: recent searches + popular locations */}
          {showIdle && (
            <Stack gap={0}>
              {/* Recent searches */}
              {recents.length > 0 && (
                <>
                  <Group justify="space-between" px="sm" pt={6} pb={2}>
                    <Text size="xs" c="dimmed" fw={600}>
                      Recent
                    </Text>
                    <ActionIcon
                      variant="subtle"
                      size="xs"
                      onClick={handleClearRecents}
                      aria-label="Clear recent searches"
                    >
                      <IconTrash size={11} />
                    </ActionIcon>
                  </Group>
                  {recents.map((item) => {
                    const idx = idleIdx++;
                    return (
                      <button
                        key={`recent-${item.lat}-${item.lon}`}
                        type="button"
                        className={`${classes.result} ${activeIndex === idx ? classes.active : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelect(item.lat, item.lon, item.label);
                        }}
                        onMouseEnter={() => setActiveIndex(idx)}
                      >
                        <Group gap={6}>
                          <IconHistory size={12} style={{ opacity: 0.35 }} />
                          <Text size="xs">{item.label.split(',')[0]}</Text>
                        </Group>
                      </button>
                    );
                  })}
                </>
              )}

              {/* Popular locations */}
              <Text size="xs" c="dimmed" fw={600} px="sm" pt={6} pb={2}>
                Popular
              </Text>
              {POPULAR_LOCATIONS.map((preset) => {
                const idx = idleIdx++;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    className={`${classes.result} ${activeIndex === idx ? classes.active : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(preset.lat, preset.lon, preset.label);
                    }}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <Group gap={6}>
                      <IconCurrentLocation size={12} style={{ opacity: 0.35 }} />
                      <Text size="xs">{preset.label}</Text>
                    </Group>
                  </button>
                );
              })}
            </Stack>
          )}
        </Paper>
      )}
    </div>
  );
}

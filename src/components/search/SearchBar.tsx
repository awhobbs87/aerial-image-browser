import { useState, useEffect, useCallback, useRef } from 'react';
import { TextInput, Paper, Text, Group, Stack, ActionIcon, Loader } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { IconSearch, IconMapPin, IconX, IconCurrentLocation } from '@tabler/icons-react';
import { geocodeSearch, type GeocodingResult } from '@/lib/geocoding';
import { useSearchStore } from '@/stores/searchStore';
import { useUIStore } from '@/stores/uiStore';
import classes from './SearchBar.module.css';

interface SearchBarProps {
  onLocationSelect?: (lat: number, lon: number, label: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LOCATION_PRESETS = [
  { label: 'Hobart', lat: -42.8821, lon: 147.3272 },
  { label: 'Launceston', lat: -41.4332, lon: 147.1441 },
  { label: 'Devonport', lat: -41.1804, lon: 146.3577 },
  { label: 'Burnie', lat: -41.0511, lon: 145.9069 },
  { label: 'Strahan', lat: -42.1547, lon: 145.3281 },
  { label: 'Port Arthur', lat: -43.1476, lon: 147.8546 },
  { label: 'Cradle Mountain', lat: -41.6422, lon: 145.9509 },
  { label: 'Freycinet', lat: -42.1341, lon: 148.2918 },
];

export function SearchBar({ onLocationSelect, placeholder = 'Search Tasmania...', size = 'lg' }: SearchBarProps) {
  const { query, setQuery, setLocation } = useSearchStore();
  const { searchFocused, setSearchFocused } = useUIStore();

  const [inputValue, setInputValue] = useState(query);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [debouncedValue] = useDebouncedValue(inputValue, 300);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Geocode on debounced input change
  useEffect(() => {
    if (!debouncedValue || debouncedValue.length < 2) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    geocodeSearch(debouncedValue, 5)
      .then((geocodeResults) => {
        if (!cancelled) {
          setResults(geocodeResults);
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
      onLocationSelect?.(lat, lon, label);
    },
    [setQuery, setLocation, setSearchFocused, onLocationSelect],
  );

  const showPresets = searchFocused && inputValue.length === 0;
  const showResults = searchFocused && results.length > 0;
  const showDropdown = showPresets || showResults;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = results.length + (showPresets ? LOCATION_PRESETS.length : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      if (activeIndex < results.length) {
        const result = results[activeIndex];
        handleSelect(result.lat, result.lon, result.displayName);
      } else if (showPresets) {
        const preset = LOCATION_PRESETS[activeIndex - results.length];
        handleSelect(preset.lat, preset.lon, preset.label);
      }
    } else if (e.key === 'Escape') {
      setSearchFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleClear = () => {
    setInputValue('');
    setQuery('');
    setResults([]);
    inputRef.current?.focus();
  };

  return (
    <div className={classes.wrapper}>
      <TextInput
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.currentTarget.value)}
        onFocus={() => setSearchFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        size={size}
        leftSection={<IconSearch size={20} />}
        rightSection={
          isSearching ? (
            <Loader size="xs" />
          ) : inputValue ? (
            <ActionIcon variant="subtle" size="sm" onClick={handleClear} aria-label="Clear search">
              <IconX size={16} />
            </ActionIcon>
          ) : null
        }
        classNames={{ input: classes.input }}
      />

      {showDropdown && (
        <Paper ref={dropdownRef} className={classes.dropdown} shadow="lg" withBorder>
          {showResults && (
            <Stack gap={0}>
              {results.map((result, i) => (
                <button
                  key={result.placeId}
                  type="button"
                  className={`${classes.result} ${activeIndex === i ? classes.active : ''}`}
                  onClick={() => handleSelect(result.lat, result.lon, result.displayName)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <Group gap="sm" wrap="nowrap">
                    <IconMapPin size={16} style={{ flexShrink: 0 }} />
                    <div>
                      <Text size="sm" lineClamp={1}>{result.displayName.split(',')[0]}</Text>
                      <Text size="xs" c="dimmed" lineClamp={1}>
                        {result.displayName.split(',').slice(1).join(',').trim()}
                      </Text>
                    </div>
                  </Group>
                </button>
              ))}
            </Stack>
          )}

          {showPresets && (
            <Stack gap={0}>
              <Text size="xs" c="dimmed" fw={600} px="sm" py={4}>
                Popular locations
              </Text>
              {LOCATION_PRESETS.map((preset, i) => (
                <button
                  key={preset.label}
                  type="button"
                  className={`${classes.result} ${activeIndex === i ? classes.active : ''}`}
                  onClick={() => handleSelect(preset.lat, preset.lon, preset.label)}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  <Group gap="sm">
                    <IconCurrentLocation size={16} />
                    <Text size="sm">{preset.label}</Text>
                  </Group>
                </button>
              ))}
            </Stack>
          )}
        </Paper>
      )}
    </div>
  );
}

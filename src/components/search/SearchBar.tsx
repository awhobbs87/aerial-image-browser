import {
  getRecentSearches,
  addRecentSearch,
  clearRecentSearches,
  type RecentSearch,
} from '@/lib/recent-searches';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ClockCounterClockwiseIcon,
  CrosshairIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react';
import { InputGroup } from '@cloudflare/kumo/components/input';
import { Button } from '@cloudflare/kumo/components/button';
import { geocodeSearch, type GeocodingResult } from '@/lib/geocoding';
import { useSearchStore } from '@/stores/searchStore';
import { useUIStore } from '@/stores/uiStore';
import { useFilterStore } from '@/stores/filterStore';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface SearchBarProps {
  onLocationSelect?: (lat: number, lon: number, label: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
}

const POPULAR_LOCATIONS = [
  { label: 'Hobart', lat: -42.8821, lon: 147.3272 },
  { label: 'Launceston', lat: -41.4332, lon: 147.1441 },
];

const inputSizeClasses = {
  sm: 'h-11 text-sm',
  md: 'h-11 text-base',
  lg: 'h-12 text-base',
};
const resultClass =
  'mx-1.5 flex min-h-11 w-[calc(100%-0.75rem)] cursor-pointer items-center rounded-xl border-0 bg-transparent px-3 py-2 text-left font-sans text-sm text-slate-800 transition hover:bg-amber-400/12 dark:text-slate-100 dark:hover:bg-amber-300/12';

export function SearchBar({
  onLocationSelect,
  placeholder = 'Search Tasmania...',
  size = 'lg',
}: SearchBarProps) {
  const { query, setQuery, setLocation } = useSearchStore();
  const { searchFocused, setSearchFocused } = useUIStore();
  const resetFilters = useFilterStore((state) => state.resetFilters);

  const [inputValue, setInputValue] = useState(query);
  const [searchError, setSearchError] = useState('');
  const [resultsQuery, setResultsQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recents, setRecents] = useState<RecentSearch[]>([]);
  const debouncedValue = useDebouncedValue(inputValue, 220);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const [dropdownMaxHeight, setDropdownMaxHeight] = useState(320);

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!searchFocused) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (wrapperRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setSearchFocused(false);
      setActiveIndex(-1);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [searchFocused, setSearchFocused]);

  // SSR inputs can receive focus and typing before React attaches its handlers.
  useEffect(() => {
    const id = setTimeout(() => {
      const input = inputRef.current;
      if (input && document.activeElement === input) {
        setSearchFocused(true);
        setRecents(getRecentSearches());
        setInputValue(input.value);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [setSearchFocused]);

  // Geocode on debounced input
  useEffect(() => {
    if (!searchFocused || !debouncedValue || debouncedValue.length < 2) {
      const id = setTimeout(() => setResults([]), 0);
      return () => clearTimeout(id);
    }
    const controller = new AbortController();
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setIsSearching(true);
        setSearchError('');
      }
    });
    geocodeSearch(debouncedValue, 5, controller.signal)
      .then((r) => {
        if (!cancelled) {
          setResultsQuery(debouncedValue);
          setResults(r);
          setActiveIndex(-1);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResults([]);
          setSearchError(
            error instanceof Error ? error.message : 'Search unavailable. Please try again.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsSearching(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [debouncedValue, searchFocused]);

  const handleSelect = useCallback(
    (lat: number, lon: number, label: string) => {
      setQuery(label);
      setInputValue(label);
      resetFilters();
      setLocation(lat, lon);
      setResults([]);
      setSearchFocused(false);
      setActiveIndex(-1);
      addRecentSearch({ label, lat, lon });
      onLocationSelect?.(lat, lon, label);
    },
    [setQuery, resetFilters, setLocation, setSearchFocused, onLocationSelect],
  );

  const handleClearRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentSearches();
    setRecents([]);
  };

  const showResults = searchFocused && results.length > 0 && inputValue === resultsQuery;
  const showIdle = searchFocused && inputValue.length === 0;
  const showDropdown = showResults || showIdle || (searchFocused && inputValue.length >= 2);

  useEffect(() => {
    if (!showDropdown) return undefined;

    const updateRect = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const viewportOffsetTop = window.visualViewport?.offsetTop ?? 0;
      const mobileNavReserve = window.matchMedia('(max-width: 47.99em)').matches ? 76 : 16;
      const available = viewportOffsetTop + viewportHeight - rect.bottom - mobileNavReserve;
      setDropdownRect(rect);
      setDropdownMaxHeight(Math.max(176, Math.min(320, available)));
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    window.visualViewport?.addEventListener('resize', updateRect);
    window.visualViewport?.addEventListener('scroll', updateRect);
    document.addEventListener('astro:page-load', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
      window.visualViewport?.removeEventListener('resize', updateRect);
      window.visualViewport?.removeEventListener('scroll', updateRect);
      document.removeEventListener('astro:page-load', updateRect);
    };
  }, [showDropdown, inputValue, results.length, recents.length]);

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

  const handleFocus = () => {
    setRecents(getRecentSearches());
    setSearchFocused(true);
  };

  // Track the flat index for idle items
  let idleIdx = 0;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div ref={anchorRef} className="relative">
        <InputGroup
          size="lg"
          className={`rounded-[1.1rem] border border-slate-950/10 bg-gradient-to-b from-white/96 to-slate-100/90 text-slate-950 shadow-none ring-0 transition duration-150 focus-within:border-amber-500/38 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/13 focus-within:shadow-[0_8px_20px_rgba(15,23,42,0.08)] dark:border-border dark:from-card dark:to-card dark:text-slate-50 dark:focus-within:bg-white/10 dark:focus-within:shadow-[0_8px_20px_rgba(0,0,0,0.24)] ${inputSizeClasses[size]}`}
        >
          <InputGroup.Addon align="start" className="pl-4 text-slate-500 dark:text-slate-400">
            <MagnifyingGlassIcon size={18} />
          </InputGroup.Addon>
          <InputGroup.Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-full min-w-0 flex-1 bg-transparent px-3 text-inherit ring-0 placeholder:text-slate-500 focus:ring-0 dark:placeholder:text-slate-400"
          />
          <InputGroup.Addon align="end" className="pr-2">
            {isSearching ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500 dark:border-slate-700 dark:border-t-amber-300" />
            ) : inputValue ? (
              <InputGroup.Button
                type="button"
                onClick={handleClear}
                aria-label="Clear search"
                icon={XIcon}
                variant="ghost"
                shape="circle"
              />
            ) : null}
          </InputGroup.Addon>
        </InputGroup>
      </div>

      {showDropdown &&
        dropdownRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-dropdown overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-950/10 bg-white/95 py-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.2)] backdrop-blur-xl overscroll-contain dark:border-border dark:bg-popover"
            style={{
              top: dropdownRect.bottom + 8,
              left: Math.max(8, dropdownRect.left),
              width: Math.min(dropdownRect.width, window.innerWidth - 16),
              maxHeight: dropdownMaxHeight,
            }}
          >
            {searchFocused && inputValue.length >= 2 && !showResults && (
              <p className="px-4 py-3 text-sm text-muted-foreground" role="status">
                {isSearching || inputValue !== debouncedValue
                  ? 'Searching Tasmania…'
                  : searchError || 'No matching Tasmanian locations. Try a street and suburb.'}
              </p>
            )}
            {/* Geocode results */}
            {showResults && (
              <div className="flex flex-col">
                {results.map((result, i) => (
                  <Button
                    key={result.placeId}
                    type="button"
                    variant="ghost"
                    className={`${resultClass} h-auto rounded-none ${activeIndex === i ? 'bg-amber-400/12 dark:bg-amber-300/12' : ''}`}
                    onClick={() => {
                      handleSelect(result.lat, result.lon, result.displayName);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <div className="flex min-w-0 items-start gap-1.5">
                      <MapPinIcon size={13} className="mt-0.5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">
                          {result.displayName.split(',')[0]}
                        </div>
                        <div className="truncate text-xs leading-tight text-slate-500 dark:text-slate-400">
                          {result.displayName.split(',').slice(1, 3).join(',').trim()}
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}

            {/* Idle: recent searches + popular locations */}
            {showIdle && (
              <div className="flex flex-col">
                {/* Recent searches */}
                {recents.length > 0 && (
                  <>
                    <div className="flex items-center justify-between px-3 pt-1.5 pb-0.5">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Recent
                      </span>
                      <Button
                        type="button"
                        onClick={handleClearRecents}
                        aria-label="Clear recent searches"
                        icon={TrashIcon}
                        variant="ghost"
                        shape="circle"
                        size="sm"
                      />
                    </div>
                    {recents.map((item) => {
                      const idx = idleIdx++;
                      return (
                        <Button
                          key={`recent-${item.lat}-${item.lon}`}
                          type="button"
                          variant="ghost"
                          className={`${resultClass} h-auto rounded-none ${activeIndex === idx ? 'bg-amber-400/12 dark:bg-amber-300/12' : ''}`}
                          onClick={() => {
                            handleSelect(item.lat, item.lon, item.label);
                          }}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          <span className="flex items-center gap-1.5">
                            <ClockCounterClockwiseIcon size={12} className="text-slate-400" />
                            <span className="text-xs">{item.label.split(',')[0]}</span>
                          </span>
                        </Button>
                      );
                    })}
                  </>
                )}

                {/* Popular locations */}
                <span className="px-3 pt-1.5 pb-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Popular
                </span>
                {POPULAR_LOCATIONS.map((preset) => {
                  const idx = idleIdx++;
                  return (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="ghost"
                      className={`${resultClass} h-auto rounded-none ${activeIndex === idx ? 'bg-amber-400/12 dark:bg-amber-300/12' : ''}`}
                      onClick={() => {
                        handleSelect(preset.lat, preset.lon, preset.label);
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <span className="flex items-center gap-1.5">
                        <CrosshairIcon size={12} className="text-slate-400" />
                        <span className="text-xs">{preset.label}</span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

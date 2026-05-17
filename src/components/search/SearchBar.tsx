import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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

interface RecentSearch {
  label: string;
  lat: number;
  lon: number;
}

const RECENT_KEY = 'tas-aerial-recent-searches';
const MAX_RECENT = 5;
const inputSizeClasses = {
  sm: 'h-11 text-sm',
  md: 'h-11 text-base',
  lg: 'h-12 text-base',
};
const resultClass =
  'mx-1.5 flex min-h-10 w-[calc(100%-0.75rem)] cursor-pointer items-center rounded-xl border-0 bg-transparent px-3 py-2 text-left font-sans text-sm text-slate-800 transition hover:bg-amber-400/12 dark:text-slate-100 dark:hover:bg-amber-300/12';

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

  useEffect(() => {
    if (!showDropdown) {
      setDropdownRect(null);
      return undefined;
    }

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

  // Track the flat index for idle items
  let idleIdx = 0;

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div ref={anchorRef} className="relative">
        <IconSearch
          size={18}
          className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-500 dark:text-slate-400"
        />
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.currentTarget.value)}
          onFocus={() => setSearchFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full rounded-[1.1rem] border border-slate-950/10 bg-gradient-to-b from-white/96 to-slate-100/90 pr-12 pl-12 text-slate-950 outline-none transition duration-150 placeholder:text-slate-500 focus:border-amber-500/38 focus:bg-white focus:shadow-[0_0_0_4px_rgba(245,158,11,0.13),0_8px_20px_rgba(15,23,42,0.08)] dark:border-white/10 dark:from-white/10 dark:to-white/5 dark:text-slate-50 dark:placeholder:text-slate-400 dark:focus:bg-white/10 dark:focus:shadow-[0_0_0_4px_rgba(245,158,11,0.13),0_8px_20px_rgba(0,0,0,0.24)] ${inputSizeClasses[size]}`}
        />
        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center justify-center">
          {isSearching ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500 dark:border-slate-700 dark:border-t-amber-300" />
          ) : inputValue ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <IconX size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {showDropdown &&
        dropdownRect &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-dropdown overflow-x-hidden overflow-y-auto rounded-2xl border border-slate-950/10 bg-white/95 py-1.5 shadow-[0_18px_48px_rgba(15,23,42,0.2)] backdrop-blur-xl overscroll-contain dark:border-white/10 dark:bg-slate-950/95"
            style={{
              top: dropdownRect.bottom + 8,
              left: Math.max(8, dropdownRect.left),
              width: Math.min(dropdownRect.width, window.innerWidth - 16),
              maxHeight: dropdownMaxHeight,
            }}
          >
            {/* Geocode results */}
            {showResults && (
              <div className="flex flex-col">
                {results.map((result, i) => (
                  <button
                    key={result.placeId}
                    type="button"
                    className={`${resultClass} ${activeIndex === i ? 'bg-amber-400/12 dark:bg-amber-300/12' : ''}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(result.lat, result.lon, result.displayName);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    <div className="flex min-w-0 items-start gap-1.5">
                      <IconMapPin size={13} className="mt-0.5 shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">
                          {result.displayName.split(',')[0]}
                        </div>
                        <div className="truncate text-xs leading-tight text-slate-500 dark:text-slate-400">
                          {result.displayName.split(',').slice(1, 3).join(',').trim()}
                        </div>
                      </div>
                    </div>
                  </button>
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
                      <button
                        type="button"
                        onClick={handleClearRecents}
                        aria-label="Clear recent searches"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                      >
                        <IconTrash size={11} />
                      </button>
                    </div>
                    {recents.map((item) => {
                      const idx = idleIdx++;
                      return (
                        <button
                          key={`recent-${item.lat}-${item.lon}`}
                          type="button"
                          className={`${resultClass} ${activeIndex === idx ? 'bg-amber-400/12 dark:bg-amber-300/12' : ''}`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelect(item.lat, item.lon, item.label);
                          }}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          <span className="flex items-center gap-1.5">
                            <IconHistory size={12} className="text-slate-400" />
                            <span className="text-xs">{item.label.split(',')[0]}</span>
                          </span>
                        </button>
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
                    <button
                      key={preset.label}
                      type="button"
                      className={`${resultClass} ${activeIndex === idx ? 'bg-amber-400/12 dark:bg-amber-300/12' : ''}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(preset.lat, preset.lon, preset.label);
                      }}
                      onMouseEnter={() => setActiveIndex(idx)}
                    >
                      <span className="flex items-center gap-1.5">
                        <IconCurrentLocation size={12} className="text-slate-400" />
                        <span className="text-xs">{preset.label}</span>
                      </span>
                    </button>
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

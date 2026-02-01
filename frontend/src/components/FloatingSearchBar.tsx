import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  Button,
  IconButton,
  CircularProgress,
  Autocomplete,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Search,
  MyLocation,
  AutoAwesome,
  Place,
  History as HistoryIcon,
  TravelExplore,
  Delete,
} from "@mui/icons-material";
import geocodingService, { type SearchSuggestion } from "../lib/geocoding";
import searchHistory, { type SearchHistoryItem } from "../lib/searchHistory";

interface FloatingSearchBarProps {
  onSearch: (lat: number, lon: number, name: string) => void;
  onAISearchClick: () => void;
  loading?: boolean;
}

const QUICK_JUMP_LOCATIONS = [
  { name: "Hobart", lat: -42.8821, lon: 147.3272 },
  { name: "Launceston", lat: -41.4332, lon: 147.1441 },
];

type SearchOption =
  | { type: "suggestion"; data: SearchSuggestion }
  | { type: "history"; data: SearchHistoryItem }
  | { type: "preset"; data: { name: string; lat: number; lon: number } };

const FloatingSearchBar: React.FC<FloatingSearchBarProps> = ({
  onSearch,
  onAISearchClick,
  loading = false,
}) => {
  const [searchValue, setSearchValue] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);

  // Load search history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        // Try server first if available
        if (typeof (searchHistory as any).getHistoryFromServer === "function") {
          const serverHistory = await (
            searchHistory as any
          ).getHistoryFromServer();
          setHistory(serverHistory);
        } else {
          // Fall back to localStorage
          setHistory(searchHistory.getHistory());
        }
      } catch (error) {
        console.error("Failed to load history from server:", error);
        // Fall back to localStorage
        setHistory(searchHistory.getHistory());
      }
    };
    loadHistory();
  }, []);

  // Fetch suggestions with debounce
  useEffect(() => {
    let isCurrent = true;

    const fetchSuggestions = async () => {
      if (searchValue.length < 2) {
        if (isCurrent) {
          setSuggestions([]);
          setIsSearching(false);
        }
        return;
      }

      if (isCurrent) {
        setIsSearching(true);
      }

      try {
        const results = await geocodingService.searchLocations(searchValue, 8);
        if (isCurrent) {
          setSuggestions(results);
        }
      } catch (error) {
        console.error("Search suggestions error:", error);
        if (isCurrent) {
          setSuggestions([]);
        }
      } finally {
        if (isCurrent) {
          setIsSearching(false);
        }
      }
    };

    // Show loading immediately when typing
    if (searchValue.length >= 2) {
      setIsSearching(true);
    }

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => {
      isCurrent = false;
      clearTimeout(debounceTimer);
    };
  }, [searchValue]);

  // Memoized options array
  const options = useMemo((): SearchOption[] => {
    const opts: SearchOption[] = [];

    // If searching, show suggestions
    if (searchValue.length >= 2) {
      opts.push(
        ...suggestions.map((s) => ({ type: "suggestion" as const, data: s })),
      );
    }
    // If empty and has history, show history
    else if (searchValue.length === 0 && history.length > 0) {
      opts.push(...history.map((h) => ({ type: "history" as const, data: h })));
    }
    // If empty and no history, show presets
    else if (searchValue.length === 0 && history.length === 0) {
      opts.push(
        ...QUICK_JUMP_LOCATIONS.map((p) => ({
          type: "preset" as const,
          data: p,
        })),
      );
    }

    return opts;
  }, [searchValue, suggestions, history]);

  const addToHistory = useCallback(
    (locationName: string, lat: number, lon: number) => {
      // Add to local history
      searchHistory.addSearch(locationName, lat, lon);
      setHistory(searchHistory.getHistory());

      // Try server sync in background
      if (typeof (searchHistory as any).addSearchToServer === "function") {
        (searchHistory as any)
          .addSearchToServer(locationName, lat, lon)
          .catch((err: Error) =>
            console.warn("Failed to sync search to server:", err),
          );
      }
    },
    [],
  );

  const handleSearch = useCallback(async () => {
    if (!searchValue.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const results = await geocodingService.searchLocations(searchValue, 1);
      if (results.length > 0) {
        const result = results[0];
        const locationName = geocodingService.formatLocationName(result);
        addToHistory(locationName, result.lat, result.lon);
        onSearch(result.lat, result.lon, locationName);
        setSearchValue("");
        setDropdownOpen(false);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  }, [searchValue, isSearching, onSearch, addToHistory]);

  const handleOptionSelect = useCallback(
    (option: SearchOption | null) => {
      if (!option) return;

      let lat: number, lon: number, locationName: string;

      if (option.type === "suggestion") {
        lat = option.data.lat;
        lon = option.data.lon;
        locationName = geocodingService.formatLocationName(option.data);
      } else if (option.type === "history") {
        lat = option.data.lat;
        lon = option.data.lon;
        locationName = option.data.query;
      } else {
        lat = option.data.lat;
        lon = option.data.lon;
        locationName = option.data.name;
      }

      addToHistory(locationName, lat, lon);
      onSearch(lat, lon, locationName);
      setSearchValue("");
      setDropdownOpen(false);
    },
    [onSearch, addToHistory],
  );

  const handleQuickJump = (location: (typeof QUICK_JUMP_LOCATIONS)[0]) => {
    addToHistory(location.name, location.lat, location.lon);
    onSearch(location.lat, location.lon, location.name);
  };

  const handleNearMe = async () => {
    if (geolocating) return;

    setGeolocating(true);
    try {
      const location = await geocodingService.getCurrentLocation();
      if (location) {
        const result = await geocodingService.reverseGeocode(
          location.lat,
          location.lon,
        );
        const locationName = result
          ? geocodingService.formatLocationName(result)
          : "Current Location";
        addToHistory(locationName, location.lat, location.lon);
        onSearch(location.lat, location.lon, locationName);
      }
    } catch (error) {
      console.error("Geolocation error:", error);
    } finally {
      setGeolocating(false);
    }
  };

  const handleRemoveHistoryItem = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    searchHistory.removeSearch(id);
    setHistory(searchHistory.getHistory());
  };

  const isLoading = loading || isSearching;

  return (
    <Box
      sx={{
        position: "absolute",
        top: 64,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 420,
        px: 2,
        zIndex: 1000,
      }}
    >
      <Box
        sx={{
          backdropFilter: "blur(12px) saturate(180%)",
          WebkitBackdropFilter: "blur(12px) saturate(180%)",
          background: "rgba(30, 41, 59, 0.85)",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          p: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        {/* Search Input with Autocomplete */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Autocomplete
            freeSolo
            fullWidth
            open={dropdownOpen}
            onOpen={() => setDropdownOpen(true)}
            onClose={(_event, reason) => {
              if (reason === "selectOption" || reason === "escape") {
                setDropdownOpen(false);
              } else if (reason === "blur" && !isSearching) {
                setDropdownOpen(false);
              }
            }}
            options={options}
            getOptionLabel={(option) => {
              if (typeof option === "string") return option;
              if (option.type === "suggestion") return option.data.displayName;
              if (option.type === "history") return option.data.query;
              return option.data.name;
            }}
            inputValue={searchValue}
            onInputChange={(_event, newValue, reason) => {
              setSearchValue(newValue);
              if (reason === "input" && newValue.length >= 2) {
                setDropdownOpen(true);
              } else if (reason === "input" && newValue.length === 0) {
                setDropdownOpen(true);
              }
            }}
            onChange={(_event, value) => {
              if (typeof value !== "string" && value !== null) {
                handleOptionSelect(value);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && searchValue.trim()) {
                // Only handle Enter if not selecting from dropdown
                const target = event.target as HTMLInputElement;
                if (!target.getAttribute("aria-activedescendant")) {
                  handleSearch();
                }
              }
            }}
            loading={isSearching}
            filterOptions={(x) => x}
            renderOption={(props, option) => {
              if (typeof option === "string") return null;

              const { key, ...restProps } = props;

              return (
                <ListItem
                  key={`${option.type}-${option.type === "suggestion" ? option.data.placeId : option.type === "history" ? option.data.id : option.data.name}`}
                  {...restProps}
                  sx={{
                    py: 1,
                    px: 1.5,
                    "&:hover": {
                      bgcolor: "rgba(16, 185, 129, 0.1)",
                    },
                    "&.Mui-focused": {
                      bgcolor: "rgba(16, 185, 129, 0.15)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {option.type === "suggestion" && (
                      <Place sx={{ fontSize: 20, color: "#10B981" }} />
                    )}
                    {option.type === "history" && (
                      <HistoryIcon
                        sx={{ fontSize: 20, color: "rgba(148, 163, 184, 0.7)" }}
                      />
                    )}
                    {option.type === "preset" && (
                      <TravelExplore sx={{ fontSize: 20, color: "#06B6D4" }} />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      option.type === "suggestion"
                        ? geocodingService.formatLocationName(option.data)
                        : option.type === "history"
                          ? option.data.query
                          : option.data.name
                    }
                    secondary={
                      option.type === "history"
                        ? searchHistory.formatTimestamp(option.data.timestamp)
                        : option.type === "suggestion"
                          ? option.data.category || option.data.type
                          : "Quick location"
                    }
                    primaryTypographyProps={{
                      fontSize: "0.875rem",
                      color: "#F1F5F9",
                      fontWeight: 500,
                    }}
                    secondaryTypographyProps={{
                      fontSize: "0.7rem",
                      color: "rgba(148, 163, 184, 0.7)",
                    }}
                  />
                  {option.type === "history" && (
                    <IconButton
                      size="small"
                      onClick={(e) =>
                        handleRemoveHistoryItem(option.data.id, e)
                      }
                      sx={{
                        ml: 1,
                        opacity: 0,
                        color: "rgba(148, 163, 184, 0.6)",
                        transition: "opacity 0.2s ease",
                        ".MuiListItem-root:hover &": {
                          opacity: 1,
                        },
                        "&:hover": {
                          color: "#EF4444",
                          bgcolor: "rgba(239, 68, 68, 0.1)",
                        },
                      }}
                    >
                      <Delete sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </ListItem>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search Tasmania..."
                variant="outlined"
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    borderRadius: "12px",
                    fontSize: "0.875rem",
                    color: "#F1F5F9",
                    transition: "all 0.2s ease",
                    "& fieldset": {
                      borderColor: "rgba(148, 163, 184, 0.2)",
                      transition: "all 0.2s ease",
                    },
                    "&:hover fieldset": {
                      borderColor: "rgba(148, 163, 184, 0.35)",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "#10B981",
                      borderWidth: "1px",
                    },
                  },
                  "& .MuiOutlinedInput-input": {
                    "&::placeholder": {
                      color: "rgba(148, 163, 184, 0.6)",
                      opacity: 1,
                    },
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search
                        sx={{ color: "rgba(148, 163, 184, 0.8)", fontSize: 20 }}
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <>
                      {isSearching && (
                        <CircularProgress size={18} sx={{ color: "#10B981" }} />
                      )}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            noOptionsText={
              searchValue.length < 2
                ? history.length === 0
                  ? "Type to search..."
                  : "Recent searches"
                : "No locations found"
            }
            componentsProps={{
              paper: {
                sx: {
                  background: "rgba(30, 41, 59, 0.95)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                  borderRadius: "12px",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
                  mt: 0.5,
                  "& .MuiAutocomplete-listbox": {
                    maxHeight: "280px",
                    py: 0.5,
                  },
                  "& .MuiAutocomplete-noOptions": {
                    color: "rgba(148, 163, 184, 0.6)",
                    fontSize: "0.875rem",
                    py: 1.5,
                  },
                },
              },
            }}
          />
          {/* Search Button */}
          <IconButton
            onClick={handleSearch}
            disabled={isLoading || !searchValue.trim()}
            sx={{
              bgcolor: "#10B981",
              color: "#fff",
              borderRadius: "12px",
              width: 42,
              height: 42,
              transition: "all 0.2s ease",
              "&:hover": {
                bgcolor: "#059669",
                boxShadow: "0 0 16px rgba(16, 185, 129, 0.4)",
              },
              "&.Mui-disabled": {
                bgcolor: "rgba(148, 163, 184, 0.2)",
                color: "rgba(148, 163, 184, 0.5)",
              },
            }}
          >
            <Search sx={{ fontSize: 22 }} />
          </IconButton>
        </Box>

        {/* Quick Jump Chips */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            component="span"
            sx={{
              fontSize: "0.7rem",
              fontWeight: 500,
              color: "rgba(148, 163, 184, 0.7)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Quick Jump
          </Box>
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            {QUICK_JUMP_LOCATIONS.map((location) => (
              <Chip
                key={location.name}
                label={location.name}
                onClick={() => handleQuickJump(location)}
                disabled={isLoading}
                size="small"
                sx={{
                  height: 26,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  color: "#F1F5F9",
                  border: "1px solid rgba(148, 163, 184, 0.15)",
                  borderRadius: "13px",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "rgba(16, 185, 129, 0.15)",
                    borderColor: "rgba(16, 185, 129, 0.4)",
                    boxShadow: "0 0 12px rgba(16, 185, 129, 0.3)",
                  },
                  "&:active": {
                    transform: "scale(0.97)",
                  },
                  "& .MuiChip-label": {
                    px: 1.25,
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: 1 }}>
          {/* Near Me Button */}
          <Button
            variant="contained"
            onClick={handleNearMe}
            disabled={geolocating || loading}
            startIcon={
              geolocating ? (
                <CircularProgress size={16} sx={{ color: "#fff" }} />
              ) : (
                <MyLocation sx={{ fontSize: 18 }} />
              )
            }
            sx={{
              flex: 1,
              height: 36,
              borderRadius: "18px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              background: "linear-gradient(135deg, #0891b2 0%, #10b981 100%)",
              boxShadow: "0 4px 14px rgba(16, 185, 129, 0.25)",
              transition: "all 0.2s ease",
              "&:hover": {
                background: "linear-gradient(135deg, #0e7490 0%, #059669 100%)",
                boxShadow: "0 6px 20px rgba(16, 185, 129, 0.35)",
                transform: "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
              "&.Mui-disabled": {
                background: "rgba(148, 163, 184, 0.2)",
                color: "rgba(148, 163, 184, 0.5)",
              },
            }}
          >
            Near Me
          </Button>

          {/* AI Search Button */}
          <Button
            variant="outlined"
            onClick={onAISearchClick}
            disabled={loading}
            startIcon={<AutoAwesome sx={{ fontSize: 18 }} />}
            sx={{
              flex: 1,
              height: 36,
              borderRadius: "18px",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              color: "#A855F7",
              borderColor: "rgba(168, 85, 247, 0.5)",
              borderWidth: "1px",
              transition: "all 0.2s ease",
              "&:hover": {
                borderColor: "#A855F7",
                backgroundColor: "rgba(168, 85, 247, 0.12)",
                boxShadow: "0 0 16px rgba(168, 85, 247, 0.25)",
                transform: "translateY(-1px)",
              },
              "&:active": {
                transform: "translateY(0)",
              },
              "&.Mui-disabled": {
                borderColor: "rgba(148, 163, 184, 0.2)",
                color: "rgba(148, 163, 184, 0.5)",
              },
            }}
          >
            AI Search
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default FloatingSearchBar;

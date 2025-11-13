import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Autocomplete,
  Paper,
  Stack,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  Search,
  MyLocation,
  History,
  Delete,
  Place,
  TravelExplore,
} from "@mui/icons-material";
import geocodingService, { type SearchSuggestion } from "../lib/geocoding";
import searchHistory, { type SearchHistoryItem } from "../lib/searchHistory";

interface SearchBarProps {
  onSearch: (lat: number, lon: number, locationName?: string) => void;
  loading?: boolean;
}

const LOCATION_PRESETS = [
  { name: "Hobart", lat: -42.8821, lon: 147.3272 },
  { name: "Launceston", lat: -41.4332, lon: 147.1441 },
  { name: "Devonport", lat: -41.1789, lon: 146.3503 },
  { name: "Burnie", lat: -41.0553, lon: 145.9099 },
];

type SearchOption =
  | { type: "suggestion"; data: SearchSuggestion }
  | { type: "history"; data: SearchHistoryItem }
  | { type: "preset"; data: { name: string; lat: number; lon: number } };

export default function SearchBar({ onSearch, loading = false }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);

  // Load search history on mount
  useEffect(() => {
    setHistory(searchHistory.getHistory());
  }, []);

  // Fetch suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      const results = await geocodingService.searchLocations(searchQuery, 10); // Request more results
      setSuggestions(results);
      setIsSearching(false);
    };

    const debounceTimer = setTimeout(fetchSuggestions, 200); // Faster response
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleOptionSelect = async (option: SearchOption | null) => {
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

    // Add to history
    searchHistory.addSearch(locationName, lat, lon);
    setHistory(searchHistory.getHistory());

    // Trigger search
    onSearch(lat, lon, locationName);
    setSearchQuery("");
  };

  const handleSearchNearMe = async () => {
    try {
      setGeolocating(true);
      const location = await geocodingService.getCurrentLocation();

      if (location) {
        // Reverse geocode to get location name
        const result = await geocodingService.reverseGeocode(location.lat, location.lon);
        const locationName = result
          ? geocodingService.formatLocationName(result)
          : "Current location";

        // Add to history
        searchHistory.addSearch(locationName, location.lat, location.lon);
        setHistory(searchHistory.getHistory());

        // Trigger search
        onSearch(location.lat, location.lon, locationName);
      }
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setGeolocating(false);
    }
  };

  const handleClearHistory = () => {
    searchHistory.clearHistory();
    setHistory([]);
  };

  const handleRemoveHistoryItem = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    searchHistory.removeSearch(id);
    setHistory(searchHistory.getHistory());
  };

  // Combine all options
  const getAllOptions = (): SearchOption[] => {
    const options: SearchOption[] = [];

    // Add suggestions if searching
    if (searchQuery.length >= 2) {
      options.push(...suggestions.map((s) => ({ type: "suggestion" as const, data: s })));
    }

    // Add history if not searching
    if (searchQuery.length === 0 && history.length > 0) {
      options.push(...history.map((h) => ({ type: "history" as const, data: h })));
    }

    // Add presets if not searching and no history
    if (searchQuery.length === 0 && history.length === 0) {
      options.push(...LOCATION_PRESETS.map((p) => ({ type: "preset" as const, data: p })));
    }

    return options;
  };

  return (
    <Paper
      elevation={4}
      sx={{
        overflow: "hidden",
        borderRadius: 2.5,
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(30, 41, 59, 0.75)"
            : "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)", // Safari support
        border: (theme) =>
          theme.palette.mode === "dark"
            ? "1px solid rgba(255, 255, 255, 0.1)"
            : "1px solid rgba(255, 255, 255, 0.8)",
        boxShadow: (theme) =>
          theme.palette.mode === "dark"
            ? "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
            : "0 8px 32px 0 rgba(31, 38, 135, 0.15)",
      }}
    >
      <Stack spacing={0}>
        {/* Main search input */}
        <Box sx={{ p: 1.5 }}>
          <Autocomplete
            freeSolo
            fullWidth
            options={getAllOptions()}
            getOptionLabel={(option) => {
              if (typeof option === "string") return option;
              if (option.type === "suggestion") return option.data.displayName;
              if (option.type === "history") return option.data.query;
              return option.data.name;
            }}
            inputValue={searchQuery}
            onInputChange={(_event, newValue) => {
              setSearchQuery(newValue);
            }}
            onChange={(_event, value) => {
              if (typeof value !== "string" && value !== null) {
                handleOptionSelect(value);
              }
            }}
            loading={isSearching}
            filterOptions={(x) => x}
            renderOption={(props, option) => {
              if (typeof option === "string") return null;

              return (
                <ListItem
                  {...props}
                  key={`${option.type}-${JSON.stringify(option.data)}`}
                  sx={{
                    py: 1,
                    "&:hover": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.05)",
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {option.type === "suggestion" && <Place color="primary" sx={{ fontSize: 20 }} />}
                    {option.type === "history" && <History color="action" sx={{ fontSize: 20 }} />}
                    {option.type === "preset" && <TravelExplore color="secondary" sx={{ fontSize: 20 }} />}
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
                        ? option.data.type
                        : "Quick location"
                    }
                    primaryTypographyProps={{ fontSize: "0.875rem" }}
                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                  />
                  {option.type === "history" && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleRemoveHistoryItem(option.data.id, e)}
                      sx={{
                        ml: 1,
                        opacity: 0.6,
                        "&:hover": { opacity: 1 }
                      }}
                    >
                      <Delete sx={{ fontSize: 18 }} />
                    </IconButton>
                  )}
                </ListItem>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Search location..."
                variant="outlined"
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: "0.875rem",
                    "& fieldset": {
                      borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
                    },
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "primary.main",
                    },
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <Search sx={{ mr: 0.5, color: "action.active", fontSize: 20 }} />,
                  endAdornment: (
                    <>
                      {isSearching && <CircularProgress size={16} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            noOptionsText={
              searchQuery.length < 2
                ? history.length === 0
                  ? "Type to search..."
                  : "Recent searches"
                : "No locations found"
            }
            componentsProps={{
              popper: {
                sx: {
                  "& .MuiAutocomplete-listbox": {
                    maxHeight: "300px",
                  }
                }
              }
            }}
          />
        </Box>

        <Divider sx={{ opacity: 0.6 }} />

        {/* Action buttons row */}
        <Box sx={{
          display: "flex",
          gap: 1,
          p: 1.5,
          pt: 1,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          {/* Quick location chips */}
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", flex: 1 }}>
            {LOCATION_PRESETS.map((preset) => (
              <Chip
                key={preset.name}
                label={preset.name}
                onClick={() =>
                  handleOptionSelect({
                    type: "preset",
                    data: preset,
                  })
                }
                size="small"
                variant="outlined"
                sx={{
                  fontSize: "0.7rem",
                  height: 24,
                  borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(8, 145, 178, 0.1)" : "rgba(8, 145, 178, 0.05)",
                  },
                }}
              />
            ))}
          </Box>

          {/* Near me button */}
          <Button
            variant="contained"
            onClick={handleSearchNearMe}
            disabled={geolocating || loading}
            startIcon={geolocating ? <CircularProgress size={14} /> : <MyLocation sx={{ fontSize: 16 }} />}
            size="small"
            sx={{
              fontSize: "0.75rem",
              height: 28,
              px: 1.5,
              whiteSpace: "nowrap",
              textTransform: "none",
              fontWeight: 600,
              background: (theme) => theme.palette.mode === "dark"
                ? "linear-gradient(135deg, #0891b2 0%, #10b981 100%)"
                : "linear-gradient(135deg, #0891b2 0%, #10b981 100%)",
              "&:hover": {
                background: (theme) => theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, #0e7490 0%, #059669 100%)"
                  : "linear-gradient(135deg, #0e7490 0%, #059669 100%)",
              },
            }}
          >
            Near Me
          </Button>
        </Box>

        {/* Clear history button - only show when there's history and no search query */}
        {history.length > 0 && searchQuery.length === 0 && (
          <>
            <Divider sx={{ opacity: 0.6 }} />
            <Box sx={{ px: 1.5, py: 1, display: "flex", justifyContent: "center" }}>
              <Button
                size="small"
                startIcon={<Delete sx={{ fontSize: 16 }} />}
                onClick={handleClearHistory}
                sx={{
                  fontSize: "0.7rem",
                  textTransform: "none",
                  color: "text.secondary",
                  "&:hover": {
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.05)",
                    color: "error.main",
                  }
                }}
              >
                Clear History
              </Button>
            </Box>
          </>
        )}
      </Stack>
    </Paper>
  );
}

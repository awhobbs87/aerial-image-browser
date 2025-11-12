import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Autocomplete,
  Paper,
  Typography,
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
      if (searchQuery.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      const results = await geocodingService.searchLocations(searchQuery, 5);
      setSuggestions(results);
      setIsSearching(false);
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
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
    if (searchQuery.length >= 3) {
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
      elevation={3}
      sx={{
        p: 3,
        mb: 3,
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f7fafc 100%)",
        border: (theme) =>
          theme.palette.mode === "dark" ? "1px solid #4a5568" : "1px solid #e2e8f0",
      }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: (theme) =>
                theme.palette.mode === "dark"
                  ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Search for Aerial Photos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Search by address, place name, or click "Near Me" to use your location
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
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
            onInputChange={(_event, newValue) => setSearchQuery(newValue)}
            onChange={(_event, value) => {
              if (typeof value !== "string") {
                handleOptionSelect(value);
              }
            }}
            loading={isSearching}
            renderOption={(props, option) => {
              if (typeof option === "string") return null;

              return (
                <ListItem {...props} key={`${option.type}-${JSON.stringify(option.data)}`}>
                  <ListItemIcon>
                    {option.type === "suggestion" && <Place color="primary" />}
                    {option.type === "history" && <History color="action" />}
                    {option.type === "preset" && <TravelExplore color="secondary" />}
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
                  />
                  {option.type === "history" && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleRemoveHistoryItem(option.data.id, e)}
                      sx={{ ml: 1 }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </ListItem>
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Try 'Hobart', '123 Main St', or any Tasmania location..."
                variant="outlined"
                InputProps={{
                  ...params.InputProps,
                  startAdornment: <Search sx={{ mr: 1, color: "action.active" }} />,
                  endAdornment: (
                    <>
                      {isSearching && <CircularProgress size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: "1.1rem",
                    py: 0.5,
                  },
                }}
              />
            )}
            noOptionsText={
              searchQuery.length < 3
                ? history.length === 0
                  ? "Start typing an address or place name..."
                  : "Recent searches will appear here"
                : "No locations found. Try a different search term."
            }
          />

          <Button
            variant="contained"
            onClick={handleSearchNearMe}
            disabled={geolocating || loading}
            startIcon={geolocating ? <CircularProgress size={20} /> : <MyLocation />}
            sx={{
              height: 56,
              px: 3,
              whiteSpace: "nowrap",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              "&:hover": {
                background: "linear-gradient(135deg, #5568d3 0%, #5a3679 100%)",
              },
            }}
          >
            Near Me
          </Button>
        </Box>

        {/* Quick location chips */}
        {searchQuery.length === 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                Quick Locations:
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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
                    icon={<Place />}
                    variant="outlined"
                    sx={{
                      "&:hover": {
                        background: (theme) => theme.palette.action.hover,
                      },
                    }}
                  />
                ))}
              </Box>
            </Box>
          </>
        )}

        {/* Clear history button */}
        {history.length > 0 && searchQuery.length === 0 && (
          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button size="small" startIcon={<Delete />} onClick={handleClearHistory}>
              Clear Search History
            </Button>
          </Box>
        )}
      </Stack>
    </Paper>
  );
}

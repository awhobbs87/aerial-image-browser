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
  Tooltip,
} from "@mui/material";
import {
  Search,
  MyLocation,
  History,
  Delete,
  Place,
  TravelExplore,
  AutoAwesome,
} from "@mui/icons-material";
import geocodingService, { type SearchSuggestion } from "../lib/geocoding";
import searchHistory, { type SearchHistoryItem } from "../lib/searchHistory";
import { appleLiquidGlass, getThemeValue } from "../theme/apple-liquid-glass";
import AISearchModal from "./AISearchModal";

interface SearchBarProps {
  onSearch: (
    lat: number,
    lon: number,
    locationName?: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      imageTypes?: string[];
    },
  ) => void;
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

export default function SearchBar({
  onSearch,
  loading = false,
}: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [geolocating, setGeolocating] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Load search history on mount
  useEffect(() => {
    setHistory(searchHistory.getHistory());
  }, []);

  // Fetch suggestions as user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await geocodingService.searchLocations(searchQuery, 10);
        setSuggestions(results);
      } catch (error) {
        console.error("Search error:", error);
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    // Show loading immediately when typing
    if (searchQuery.length >= 2) {
      setIsSearching(true);
    }

    const debounceTimer = setTimeout(fetchSuggestions, 150); // Slightly faster
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
        const result = await geocodingService.reverseGeocode(
          location.lat,
          location.lon,
        );
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
      options.push(
        ...suggestions.map((s) => ({ type: "suggestion" as const, data: s })),
      );
    }

    // Add history if not searching
    if (searchQuery.length === 0 && history.length > 0) {
      options.push(
        ...history.map((h) => ({ type: "history" as const, data: h })),
      );
    }

    // Add presets if not searching and no history
    if (searchQuery.length === 0 && history.length === 0) {
      options.push(
        ...LOCATION_PRESETS.map((p) => ({ type: "preset" as const, data: p })),
      );
    }

    return options;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        overflow: "hidden",
        borderRadius: appleLiquidGlass.radius.large,
        // Windows 7 Aero style: Very transparent with strong blur
        bgcolor: (theme) =>
          theme.palette.mode === "dark"
            ? "rgba(42, 42, 42, 0.35)" // Very transparent - Windows 7 Aero style
            : "rgba(255, 255, 255, 0.35)", // Very transparent - Windows 7 Aero style
        backdropFilter: "blur(40px) saturate(200%)",
        WebkitBackdropFilter: "blur(40px) saturate(200%)",
        "@supports not (backdrop-filter: blur(40px))": {
          bgcolor: (theme) =>
            theme.palette.mode === "dark"
              ? "rgba(42, 42, 42, 0.75)" // Fallback: less transparent when blur not supported
              : "rgba(255, 255, 255, 0.75)",
        },
        border: (theme) =>
          `1px solid ${getThemeValue(appleLiquidGlass.borders.subtle, theme.palette.mode === "dark")}`,
        boxShadow: (theme) => {
          const shadows = getThemeValue(
            {
              light: appleLiquidGlass.shadows.light,
              dark: appleLiquidGlass.shadows.dark,
            },
            theme.palette.mode === "dark",
          );
          return `${shadows.elevated}, ${shadows.innerFrosted}`;
        },
      }}
    >
      <Stack spacing={0}>
        {/* Main search input */}
        <Box sx={{ p: { xs: 1, md: 1.5 } }}>
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
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(99, 102, 241, 0.1)"
                          : "rgba(99, 102, 241, 0.05)",
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {option.type === "suggestion" && (
                      <Place color="primary" sx={{ fontSize: 20 }} />
                    )}
                    {option.type === "history" && (
                      <History color="action" sx={{ fontSize: 20 }} />
                    )}
                    {option.type === "preset" && (
                      <TravelExplore color="secondary" sx={{ fontSize: 20 }} />
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
                          ? (option.data.category || option.data.type) +
                            (option.data.confidence
                              ? ` (${Math.round(option.data.confidence * 100)}% match)`
                              : "")
                          : "Quick location"
                    }
                    primaryTypographyProps={{ fontSize: "0.875rem" }}
                    secondaryTypographyProps={{ fontSize: "0.75rem" }}
                  />
                  {option.type === "history" && (
                    <IconButton
                      size="small"
                      onClick={(e) =>
                        handleRemoveHistoryItem(option.data.id, e)
                      }
                      sx={{
                        ml: 1,
                        opacity: 0.6,
                        "&:hover": { opacity: 1 },
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
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.05)"
                        : "rgba(255, 255, 255, 0.5)", // Translucent input background
                    "& fieldset": {
                      borderColor: (theme) =>
                        getThemeValue(
                          appleLiquidGlass.borders.subtle,
                          theme.palette.mode === "dark",
                        ),
                    },
                    "&:hover fieldset": {
                      borderColor: (theme) => theme.palette.primary.main,
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: (theme) => theme.palette.primary.main,
                    },
                  },
                }}
                InputProps={{
                  ...params.InputProps,
                  startAdornment: (
                    <Search
                      sx={{ mr: 0.5, color: "action.active", fontSize: 20 }}
                    />
                  ),
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
                  },
                },
              },
            }}
          />
        </Box>

        <Divider
          sx={{
            borderColor: (theme) =>
              getThemeValue(
                appleLiquidGlass.borders.hairline,
                theme.palette.mode === "dark",
              ),
            opacity: 0.5,
          }}
        />

        {/* Action buttons row */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            p: { xs: 1, md: 1.5 },
            pt: { xs: 0.75, md: 1 },
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
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
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(255, 255, 255, 0.3)", // Translucent chip background
                  borderColor: (theme) =>
                    getThemeValue(
                      appleLiquidGlass.borders.medium,
                      theme.palette.mode === "dark",
                    ),
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  "&:hover": {
                    borderColor: "primary.main",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(8, 145, 178, 0.15)"
                        : "rgba(8, 145, 178, 0.1)",
                  },
                }}
              />
            ))}
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            {/* AI Search button */}
            <Tooltip title="AI-powered natural language search">
              <Button
                variant="outlined"
                onClick={() => setAiModalOpen(true)}
                disabled={loading}
                startIcon={<AutoAwesome sx={{ fontSize: 16 }} />}
                size="small"
                sx={{
                  fontSize: "0.75rem",
                  height: 28,
                  px: 1.5,
                  whiteSpace: "nowrap",
                  textTransform: "none",
                  fontWeight: 600,
                  borderColor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(168, 85, 247, 0.5)"
                      : "rgba(168, 85, 247, 0.4)",
                  color: (theme) =>
                    theme.palette.mode === "dark" ? "#c084fc" : "#9333ea",
                  "&:hover": {
                    borderColor: "#a855f7",
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(168, 85, 247, 0.15)"
                        : "rgba(168, 85, 247, 0.1)",
                  },
                }}
              >
                AI Search
              </Button>
            </Tooltip>

            {/* Near me button */}
            <Button
              variant="contained"
              onClick={handleSearchNearMe}
              disabled={geolocating || loading}
              startIcon={
                geolocating ? (
                  <CircularProgress size={14} />
                ) : (
                  <MyLocation sx={{ fontSize: 16 }} />
                )
              }
              size="small"
              sx={{
                fontSize: "0.75rem",
                height: 28,
                px: 1.5,
                whiteSpace: "nowrap",
                textTransform: "none",
                fontWeight: 600,
                background: (theme) =>
                  theme.palette.mode === "dark"
                    ? "linear-gradient(135deg, #0891b2 0%, #10b981 100%)"
                    : "linear-gradient(135deg, #0891b2 0%, #10b981 100%)",
                "&:hover": {
                  background: (theme) =>
                    theme.palette.mode === "dark"
                      ? "linear-gradient(135deg, #0e7490 0%, #059669 100%)"
                      : "linear-gradient(135deg, #0e7490 0%, #059669 100%)",
                },
              }}
            >
              Near Me
            </Button>
          </Box>
        </Box>
      </Stack>

      {/* AI Search Modal */}
      <AISearchModal
        open={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        onSearch={(lat, lon, locationName, filters) => {
          setAiModalOpen(false);
          // Add to history
          searchHistory.addSearch(locationName || "AI Search", lat, lon);
          setHistory(searchHistory.getHistory());
          onSearch(lat, lon, locationName, filters);
        }}
      />
    </Paper>
  );
}

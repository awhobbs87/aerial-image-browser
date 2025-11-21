import { useState, useMemo, useCallback, lazy, Suspense, useEffect } from "react";
import {
  ThemeProvider,
  CssBaseline,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  CircularProgress,
  useMediaQuery,
  IconButton,
  Tooltip,
  Chip,
  Button,
  Stack,
} from "@mui/material";
import { 
  GridView, 
  Map as MapIcon, 
  ExpandLess, 
  Search as SearchIcon, 
  Timeline, 
  Menu, 
  ChevronLeft, 
  FilterList, 
  History,
  PhotoLibrary,
} from "@mui/icons-material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lightTheme, darkTheme } from "./theme";
import AppBar from "./components/AppBar";
import SearchBar from "./components/SearchBar";
import PhotoGrid from "./components/PhotoGrid";
import PhotoTimeline from "./components/PhotoTimeline";
import FilterPanel, { type Filters, FILTER_PRESETS } from "./components/FilterPanel";
import MobileFilterSheet from "./components/MobileFilterSheet";
import MobileSearchSheet from "./components/MobileSearchSheet";
import FavoritesModal from "./components/FavoritesModal";
import BackToTop from "./components/BackToTop";
import LoadingBar from "./components/LoadingBar";
import ComparisonModal from "./components/ComparisonModal";
import ComparisonFAB from "./components/ComparisonFAB";
import ThenNowModal from "./components/ThenNowModal";
import ChangelogModal from "./components/ChangelogModal";
import { useSearchLocation } from "./hooks/usePhotos";
import type { LocationSearchParams, EnhancedPhoto } from "./types/api";
import PhotoViewer from "./components/PhotoViewer";

const APP_VERSION = "2.2.0";

// Lazy load MapView component for better initial load performance
const MapView = lazy(() => import("./components/MapView"));

// Create Query Client with optimized caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes - data stays fresh longer
      gcTime: 1000 * 60 * 60, // 60 minutes - keep in cache for 1 hour
      retry: 2, // Retry failed requests twice
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false, // Don't refetch if data exists
    },
  },
});

type ViewMode = "grid" | "map";
type ResultsViewMode = "grid" | "timeline" | "gallery";
type ThemeMode = "light" | "dark" | "system";
const getPhotoKey = (photo: EnhancedPhoto) => `${photo.layerId}-${photo.OBJECTID}`;

// Helper function to get the initial theme preference
const getInitialTheme = (): ThemeMode => {
  const stored = localStorage.getItem("themeMode");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
};

// Helper function to determine if dark mode should be active
const shouldUseDarkMode = (themeMode: ThemeMode, prefersDark: boolean): boolean => {
  if (themeMode === "system") {
    return prefersDark;
  }
  return themeMode === "dark";
};

function AppContent() {
  // Check system preference for dark mode
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  // Track user's theme preference (light, dark, or system)
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);

  // Calculate actual dark mode state based on preference and system
  const darkMode = useMemo(
    () => shouldUseDarkMode(themeMode, prefersDarkMode),
    [themeMode, prefersDarkMode]
  );

  const [searchParams, setSearchParams] = useState<LocationSearchParams | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [resultsViewMode, setResultsViewMode] = useState<ResultsViewMode>("grid");
  const [selectedPhoto, setSelectedPhoto] = useState<EnhancedPhoto | null>(null);
  const [hoveredPhoto, setHoveredPhoto] = useState<EnhancedPhoto | null>(null);
  const [visibleGridPhotos, setVisibleGridPhotos] = useState<EnhancedPhoto[]>([]);
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);
  const [searchBoxExpanded, setSearchBoxExpanded] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [comparisonSelection, setComparisonSelection] = useState<EnhancedPhoto[]>([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [thenNowModalOpen, setThenNowModalOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    startDate: null,
    endDate: null,
    selectedScales: [],
    layerTypes: {
      aerial: true,
      ortho: true,
      digital: true,
    },
  });

  // Persist theme preference to localStorage
  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  // Use React Query hook for fetching photos
  const {
    data,
    isLoading,
    error,
  } = useSearchLocation(searchParams);

  // Extract available scales from fetched photos
  const availableScales = useMemo(() => {
    if (!data?.photos) return [];
    const scalesSet = new Set<number>();
    data.photos.forEach(photo => {
      if (photo.SCALE && photo.SCALE > 0) {
        scalesSet.add(photo.SCALE);
      }
    });
    return Array.from(scalesSet).sort((a, b) => a - b);
  }, [data?.photos]);

  // Calculate date range from photos
  const dateRange = useMemo(() => {
    if (!data?.photos || data.photos.length === 0) return null;

    const years = data.photos
      .map(photo => photo.FLY_DATE ? new Date(photo.FLY_DATE).getFullYear() : null)
      .filter((year): year is number => year !== null);

    if (years.length === 0) return null;

    return {
      min: Math.min(...years),
      max: Math.max(...years),
    };
  }, [data?.photos]);

  // Check if filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.startDate !== null ||
      filters.endDate !== null ||
      filters.selectedScales.length > 0 ||
      !filters.layerTypes.aerial ||
      !filters.layerTypes.ortho ||
      !filters.layerTypes.digital
    );
  }, [filters]);

  // Filter photos (client-side filtering for real-time updates)
  const filteredPhotos = useMemo(() => {
    if (!data?.photos) return [];

    let photos = data.photos;

    // Filter by date range if specified
    if (filters.startDate || filters.endDate) {
      photos = photos.filter(photo => {
        if (!photo.FLY_DATE) return false;
        const photoDate = new Date(photo.FLY_DATE);
        if (filters.startDate && photoDate < filters.startDate) return false;
        if (filters.endDate && photoDate > filters.endDate) return false;
        return true;
      });
    }

    // Filter by scale if specified
    if (filters.selectedScales.length > 0) {
      photos = photos.filter(photo =>
        photo.SCALE && filters.selectedScales.includes(photo.SCALE)
      );
    }

    return photos;
  }, [data?.photos, filters.selectedScales, filters.startDate, filters.endDate]);

  // Get favorite photos for modal
  const favoritePhotos = useMemo(() => {
    if (!data?.photos) return [];
    return data.photos.filter(photo =>
      favorites.has(`${photo.layerId}-${photo.OBJECTID}`)
    );
  }, [data?.photos, favorites]);

  // Prioritize visible grid photos for map display
  // This ensures hovering on paginated/sorted photos highlights them on the map
  const mapPhotos = useMemo(() => {
    if (visibleGridPhotos.length === 0) {
      // No visible photos yet, show all filtered photos
      return filteredPhotos;
    }

    // Create a set of visible photo IDs for quick lookup
    const visibleIds = new Set(
      visibleGridPhotos.map(p => `${p.layerId}-${p.OBJECTID}`)
    );

    // Put visible photos first, then fill with remaining filtered photos
    const remainingPhotos = filteredPhotos.filter(
      p => !visibleIds.has(`${p.layerId}-${p.OBJECTID}`)
    );

    return [...visibleGridPhotos, ...remainingPhotos];
  }, [visibleGridPhotos, filteredPhotos]);

  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);
  const comparisonSelectionKeys = useMemo(
    () => new Set(comparisonSelection.map((photo) => getPhotoKey(photo))),
    [comparisonSelection]
  );
  const primaryComparisonPhoto = comparisonSelection[0] ?? null;
  const trayHidden = comparisonModalOpen || thenNowModalOpen;

  const handleToggleDarkMode = useCallback(() => {
    setThemeMode((prev) => {
      // Cycle through: light -> dark -> system -> light
      if (prev === "light") return "dark";
      if (prev === "dark") return "system";
      return "light";
    });
  }, []);

  const handleSearch = useCallback(
    (lat: number, lon: number, locationName?: string) => {
      // Convert filters to API format
      const activeLayerTypes = [];
      if (filters.layerTypes.aerial) activeLayerTypes.push("aerial");
      if (filters.layerTypes.ortho) activeLayerTypes.push("ortho");
      if (filters.layerTypes.digital) activeLayerTypes.push("digital");

      // Note: Scale filtering will be done client-side after fetching
      setSearchParams({
        lat,
        lon,
        layers: [0, 1, 2],
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString(),
        imageTypes: activeLayerTypes.length === 3 ? undefined : activeLayerTypes,
      });

      // Set search center for map to zoom to
      setSearchCenter([lat, lon]);

      // Store location name for display (optional)
      if (locationName) {
        console.log("Searching for:", locationName);
      }
    },
    [filters]
  );

  const handleViewFavorites = useCallback(() => {
    setFavoritesModalOpen(true);
  }, []);

  const handleFavorite = useCallback((photo: EnhancedPhoto) => {
    const key = `${photo.layerId}-${photo.OBJECTID}`;
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(key)) {
        newFavorites.delete(key);
      } else {
        newFavorites.add(key);
      }
      return newFavorites;
    });
  }, []);

  const handleClearAllFavorites = useCallback(() => {
    if (window.confirm(`Are you sure you want to remove all ${favorites.size} favorites?`)) {
      setFavorites(new Set());
    }
  }, [favorites.size]);

  const handleViewModeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
      if (newMode !== null) {
        setViewMode(newMode);
      }
    },
    []
  );

  const handleResultsViewModeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newMode: ResultsViewMode | null) => {
      if (newMode) {
        setResultsViewMode(newMode);
      }
    },
    []
  );

  // Unified handler for mobile 4-button control (Grid, Map, Timeline, Gallery)
  const handleMobileViewChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newValue: string | null) => {
      if (!newValue) return;
      
      if (newValue === "map") {
        setViewMode("map");
      } else {
        // For grid, timeline, or gallery, set viewMode to grid and update resultsViewMode
        setViewMode("grid");
        if (newValue === "grid" || newValue === "timeline" || newValue === "gallery") {
          setResultsViewMode(newValue as ResultsViewMode);
        }
      }
    },
    []
  );

  // Get the current value for the unified mobile control
  const mobileViewValue = useMemo(() => {
    if (viewMode === "map") return "map";
    return resultsViewMode;
  }, [viewMode, resultsViewMode]);

  const handlePhotoSelect = useCallback((photo: EnhancedPhoto) => {
    setSelectedPhoto(photo);
    // Auto-switch to map view when "Show on map" is clicked
    setViewMode("map");
  }, []);

  const handleMapClick = useCallback((lat: number, lon: number) => {
    handleSearch(lat, lon);
  }, [handleSearch]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const handleQuickFilterPreset = useCallback(
    (presetId: string) => {
      const preset = FILTER_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;

      let selectedScales = preset.filters.selectedScales;
      if (presetId === "high-detail") {
        selectedScales = availableScales.filter((scale) => scale <= 5000);
      }

      setFilters({
        ...preset.filters,
        selectedScales,
      });
    },
    [availableScales]
  );

  useEffect(() => {
    if (!data?.photos) {
      setComparisonSelection([]);
      return;
    }
    const available = new Set(data.photos.map((photo) => getPhotoKey(photo)));
    setComparisonSelection((prev) => prev.filter((photo) => available.has(getPhotoKey(photo))));
  }, [data?.photos]);

  const handleToggleComparisonSelection = useCallback((photo: EnhancedPhoto) => {
    const key = getPhotoKey(photo);
    setComparisonSelection((prev) => {
      const exists = prev.find((p) => getPhotoKey(p) === key);
      if (exists) {
        return prev.filter((p) => getPhotoKey(p) !== key);
      }
      if (prev.length >= 2) {
        return [prev[1], photo];
      }
      return [...prev, photo];
    });
  }, []);

  const handleRemoveComparisonPhoto = useCallback((photoKey: string) => {
    setComparisonSelection((prev) => prev.filter((photo) => getPhotoKey(photo) !== photoKey));
  }, []);

  const handleOpenComparisonModal = useCallback(() => {
    if (comparisonSelection.length >= 1) {
      setComparisonModalOpen(true);
    }
  }, [comparisonSelection.length]);

  const handleOpenThenNowModal = useCallback(() => {
    if (comparisonSelection.length >= 1) {
      setThenNowModalOpen(true);
    }
  }, [comparisonSelection.length]);

  const handleClearComparisonSelection = useCallback(() => {
    setComparisonSelection([]);
  }, []);

  const handleSwapComparisonPhotos = useCallback(() => {
    setComparisonSelection((prev) => {
      if (prev.length >= 2) {
        return [prev[1], prev[0]];
      }
      return prev;
    });
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Loading Progress Bar */}
      <LoadingBar loading={isLoading} />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <AppBar
          darkMode={darkMode}
          themeMode={themeMode}
          onToggleDarkMode={handleToggleDarkMode}
          favoritesCount={favorites.size}
          onViewFavorites={handleViewFavorites}
          version={APP_VERSION}
          onVersionClick={() => setChangelogOpen(true)}
        />

        {/* Desktop: Two-column layout, Mobile: Single column */}
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            minHeight: 0, // Important for flexbox scrolling
          }}
        >
          {/* Toggle button - Desktop only, always visible */}
          <IconButton
            onClick={handleToggleSidebar}
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            sx={{
              display: { xs: "none", md: "flex" },
              position: "absolute",
              left: sidebarOpen ? 460 : 8,
              top: sidebarOpen ? 80 : 120, // Move down when collapsed to avoid zoom controls
              zIndex: 1001,
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              boxShadow: 2,
              transition: "all 0.3s ease-in-out",
              "&:hover": {
                bgcolor: "background.paper",
                opacity: 0.9,
                transform: "scale(1.05)",
              },
            }}
            size="small"
          >
            {sidebarOpen ? <ChevronLeft /> : <Menu />}
          </IconButton>

          {/* Left Sidebar - Search, Filters, Results */}
          <Box
            sx={{
              width: { 
                xs: "100%", 
                md: sidebarOpen ? "480px" : 0 
              },
              display: { 
                xs: "block", 
                md: sidebarOpen ? "flex" : "none" 
              },
              flexDirection: "column",
              borderRight: { md: sidebarOpen ? 1 : 0 },
              borderColor: { md: "divider" },
              overflowY: "auto",
              overflowX: "hidden",
              maxHeight: { xs: "none", md: "calc(100vh - 64px)" },
              position: "relative",
              transition: "width 0.3s ease-in-out",
              flexShrink: 0,
              overscrollBehavior: "contain", // Prevent scroll chaining
              WebkitOverflowScrolling: "touch", // Smooth scrolling on iOS
            }}
            onWheel={(e) => {
              // Prevent page scroll when scrolling sidebar
              const target = e.currentTarget;
              const isScrolling = target.scrollHeight > target.clientHeight;
              const isAtTop = target.scrollTop === 0;
              const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 1;
              
              if (isScrolling) {
                // If we're scrolling within the sidebar, stop propagation
                if (!(isAtTop && e.deltaY < 0) && !(isAtBottom && e.deltaY > 0)) {
                  e.stopPropagation();
                }
              }
            }}
            onTouchMove={(e) => {
              // Prevent body scroll on touch devices when scrolling sidebar
              const target = e.currentTarget;
              if (target.scrollHeight > target.clientHeight) {
                e.stopPropagation();
              }
            }}
          >
            <Box 
              sx={{ 
                py: 2, 
                px: { xs: 2, md: 3 }, 
                maxWidth: "100%", 
                display: "flex",
                flexDirection: "column",
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Mobile Search Button - Show button after search, hide search bar */}
              {searchParams && (
                <Box sx={{ mb: 2, display: { xs: "block", md: "none" } }}>
                  <Button
                    variant="outlined"
                    fullWidth
                    onClick={() => setMobileSearchOpen(true)}
                    startIcon={<SearchIcon />}
                    sx={{
                      py: 1.5,
                      fontSize: "0.9375rem",
                      fontWeight: 600,
                      minHeight: 48,
                    }}
                  >
                    Search Location
                  </Button>
                </Box>
              )}
              
              {/* Search Bar - Mobile only when no search yet, Desktop in floating box on map */}
              {!searchParams && (
                <Box sx={{ mb: 2, display: { xs: "block", md: "none" } }}>
                  <SearchBar onSearch={handleSearch} loading={isLoading} />
                </Box>
              )}

              {searchParams && (
                <>
                  {/* Desktop Filter Panel */}
                  <Box sx={{ mb: 2, display: { xs: "none", md: "block" } }}>
                    <FilterPanel
                      filters={filters}
                      onFiltersChange={setFilters}
                      availableScales={availableScales}
                      dateRange={dateRange}
                      showQuickFilters={false}
                    />
                  </Box>

                  {/* Mobile Filter Button */}
                  <Box sx={{ mb: 2, display: { xs: "block", md: "none" } }}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => setMobileFilterOpen(true)}
                      startIcon={<FilterList />}
                      sx={{
                        py: 1.5,
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                        minHeight: 48, // Better touch target
                      }}
                    >
                      Filters
                      {hasActiveFilters && (
                        <Chip
                          label="Active"
                          size="small"
                          color="primary"
                          sx={{ ml: 1, height: 20, fontSize: "0.65rem" }}
                        />
                      )}
                    </Button>
                  </Box>

                  {/* Comparison Tools - Unified styling */}
                  <Box
                    sx={{
                      mb: 2,
                      display: { xs: "none", md: "block" },
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(42, 42, 42, 0.6)" // surfaceElevated
                          : "rgba(249, 250, 251, 0.8)", // surfaceAlt
                      borderRadius: 1.5,
                      px: 2,
                      py: 1.5,
                      border: (theme) =>
                        theme.palette.mode === "dark"
                          ? "1px solid rgba(255, 255, 255, 0.1)"
                          : "1px solid rgba(0, 0, 0, 0.08)",
                      boxShadow: (theme) =>
                        theme.palette.mode === "dark"
                          ? "0 1px 3px rgba(0, 0, 0, 0.3)"
                          : "0 1px 3px rgba(0, 0, 0, 0.06)",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      alignItems="center"
                      justifyContent="space-between"
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.8125rem",
                          fontWeight: 400,
                          letterSpacing: "0.01em",
                          color: (theme) =>
                            theme.palette.mode === "dark" ? "#B4B4B4" : "#6B7280", // textSecondary
                        }}
                      >
                        Select photos to compare or run Then vs Now
                      </Typography>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Button
                          variant={comparisonSelection.length >= 2 ? "contained" : "outlined"}
                          color="primary"
                          size="small"
                          startIcon={<CompareArrowsIcon fontSize="small" />}
                          disabled={comparisonSelection.length < 2}
                          onClick={handleOpenComparisonModal}
                          sx={{
                            fontWeight: 500,
                            minWidth: 120,
                            fontSize: "0.8125rem",
                            textTransform: "none",
                            px: 1.75,
                            py: 0.75,
                            borderRadius: 1,
                            "&.Mui-disabled": {
                              opacity: 0.4,
                              borderColor: "divider",
                            },
                            "&:hover:not(.Mui-disabled)": {
                              transform: "translateY(-1px)",
                              boxShadow: 2,
                            },
                          }}
                        >
                          Compare ({comparisonSelection.length}/2)
                        </Button>
                        <Button
                          variant={comparisonSelection.length === 1 ? "contained" : "outlined"}
                          color="secondary"
                          size="small"
                          disabled={comparisonSelection.length !== 1}
                          onClick={handleOpenThenNowModal}
                          startIcon={<History fontSize="small" />}
                          sx={{
                            fontWeight: 500,
                            minWidth: 120,
                            fontSize: "0.8125rem",
                            textTransform: "none",
                            px: 1.75,
                            py: 0.75,
                            borderRadius: 1,
                            "&.Mui-disabled": {
                              opacity: 0.4,
                              borderColor: "divider",
                            },
                            "&:hover:not(.Mui-disabled)": {
                              transform: "translateY(-1px)",
                              boxShadow: 2,
                            },
                          }}
                        >
                          Then vs Now
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>

                  {/* Mobile-only Unified 4-Button View Toggle */}
                  <Box sx={{ display: { xs: "block", md: "none" }, mb: 2 }}>
                    <Paper elevation={0} sx={{ bgcolor: "transparent", display: "flex", justifyContent: "center" }}>
                      <ToggleButtonGroup
                        value={mobileViewValue}
                        exclusive
                        onChange={handleMobileViewChange}
                        aria-label="view mode"
                        size="small"
                        sx={{
                          "& .MuiToggleButton-root": {
                            px: 1.25,
                            py: 0.5,
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            textTransform: "none",
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                          },
                        }}
                      >
                        <ToggleButton value="grid" aria-label="grid view">
                          <GridView sx={{ mr: 0.5, fontSize: 16 }} />
                          Grid
                        </ToggleButton>
                        <ToggleButton value="map" aria-label="map view">
                          <MapIcon sx={{ mr: 0.5, fontSize: 16 }} />
                          Map
                        </ToggleButton>
                        <ToggleButton value="timeline" aria-label="timeline view">
                          <Timeline sx={{ mr: 0.5, fontSize: 16 }} />
                          Timeline
                        </ToggleButton>
                        <ToggleButton value="gallery" aria-label="gallery view">
                          <PhotoLibrary sx={{ mr: 0.5, fontSize: 16 }} />
                          Gallery
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Paper>
                  </Box>

                  {/* Desktop 4-Button View Controls - Unified styling */}
                  <Box sx={{ display: { xs: "none", md: "block" }, mb: 2 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        bgcolor: (theme) =>
                          theme.palette.mode === "dark"
                            ? "rgba(42, 42, 42, 0.6)"
                            : "rgba(249, 250, 251, 0.8)",
                        display: "inline-block",
                        borderRadius: 1.5,
                        p: 0.5,
                        border: (theme) =>
                          theme.palette.mode === "dark"
                            ? "1px solid rgba(255, 255, 255, 0.1)"
                            : "1px solid rgba(0, 0, 0, 0.08)",
                        boxShadow: (theme) =>
                          theme.palette.mode === "dark"
                            ? "0 1px 3px rgba(0, 0, 0, 0.3)"
                            : "0 1px 3px rgba(0, 0, 0, 0.06)",
                      }}
                    >
                      <ToggleButtonGroup
                        value={viewMode === "map" ? "map" : resultsViewMode}
                        exclusive
                        onChange={(e, value) => {
                          if (value === "map") {
                            handleViewModeChange(e, "map");
                          } else if (value === "grid" || value === "timeline" || value === "gallery") {
                            handleViewModeChange(e, "grid");
                            handleResultsViewModeChange(e, value);
                          }
                        }}
                        aria-label="view mode"
                        size="small"
                        sx={{
                          gap: 0.5,
                          "& .MuiToggleButton-root": {
                            px: 1.5,
                            py: 0.625,
                            fontSize: "0.8125rem",
                            fontWeight: 500,
                            textTransform: "none",
                            border: "none",
                            borderRadius: 1,
                            color: (theme) =>
                              theme.palette.mode === "dark" ? "#B4B4B4" : "#6B7280",
                            bgcolor: "transparent",
                            "&:hover": {
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(255, 255, 255, 0.08)"
                                  : "rgba(0, 0, 0, 0.04)",
                            },
                            "&.Mui-selected": {
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark"
                                  ? "rgba(16, 185, 129, 0.2)"
                                  : "rgba(5, 150, 105, 0.1)",
                              color: (theme) =>
                                theme.palette.mode === "dark" ? "#10B981" : "#059669",
                              fontWeight: 600,
                              "&:hover": {
                                bgcolor: (theme) =>
                                  theme.palette.mode === "dark"
                                    ? "rgba(16, 185, 129, 0.25)"
                                    : "rgba(5, 150, 105, 0.15)",
                              },
                            },
                          },
                        }}
                      >
                        <ToggleButton value="grid" aria-label="grid view">
                          <GridView sx={{ mr: 0.75, fontSize: 16 }} />
                          Grid
                        </ToggleButton>
                        <ToggleButton value="map" aria-label="map view">
                          <MapIcon sx={{ mr: 0.75, fontSize: 16 }} />
                          Map
                        </ToggleButton>
                        <ToggleButton value="timeline" aria-label="timeline view">
                          <Timeline sx={{ mr: 0.75, fontSize: 16 }} />
                          Timeline
                        </ToggleButton>
                        <ToggleButton value="gallery" aria-label="gallery view">
                          <PhotoLibrary sx={{ mr: 0.75, fontSize: 16 }} />
                          Gallery
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Paper>
                  </Box>

                  {/* Results Grid (always visible on desktop, conditional on mobile) */}
                  <Box sx={{ display: { xs: viewMode === "grid" ? "block" : "none", md: "block" } }}>
                    {filteredPhotos.length > 0 && (
                      <>

                        <Box sx={{ mb: 2 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 600,
                              mb: 0.75,
                              display: "block",
                              fontSize: "0.7rem",
                              color: "text.secondary",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            Quick Filters
                          </Typography>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                            {FILTER_PRESETS.map((preset) => {
                              const Icon = preset.icon;
                              return (
                                <Tooltip key={preset.id} title={preset.description} arrow placement="top">
                                  <Chip
                                    icon={<Icon sx={{ fontSize: 14 }} />}
                                    label={preset.label}
                                    onClick={() => handleQuickFilterPreset(preset.id)}
                                    size="small"
                                    variant="outlined"
                                    sx={{
                                      height: 26,
                                      fontSize: "0.7rem",
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      transition: "all 0.2s ease-in-out",
                                      "&:hover": {
                                        borderColor: "primary.main",
                                        bgcolor: (theme) =>
                                          theme.palette.mode === "dark"
                                            ? "rgba(0, 77, 64, 0.1)"
                                            : "rgba(0, 77, 64, 0.05)",
                                        transform: "translateY(-1px)",
                                      },
                                    }}
                                  />
                                </Tooltip>
                              );
                            })}
                          </Stack>
                        </Box>
                      </>
                    )}

                    {comparisonSelection.length > 0 && (
                      <Stack direction="row" spacing={1} flexWrap="wrap" mb={2}>
                        {comparisonSelection.map((photo) => (
                          <Chip
                            key={`compare-chip-${getPhotoKey(photo)}`}
                            label={`${photo.dateFormatted || "Unknown"} • ${photo.IMAGE_NAME}`}
                            onDelete={() => handleRemoveComparisonPhoto(getPhotoKey(photo))}
                            size="small"
                            sx={{ maxWidth: 260 }}
                          />
                        ))}
                        <Chip
                          label="Clear"
                          onClick={handleClearComparisonSelection}
                          onDelete={comparisonSelection.length ? handleClearComparisonSelection : undefined}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    )}

                    {resultsViewMode === 'gallery' ? (
                      <PhotoViewer
                        photo={filteredPhotos[0] || null}
                        photos={filteredPhotos}
                        open
                        onClose={() => setResultsViewMode('grid')} // Go back to grid when closing
                        initialIndex={0}
                      />
                    ) : resultsViewMode === "grid" ? (
                      <PhotoGrid
                        photos={filteredPhotos}
                        loading={isLoading}
                        error={error as Error}
                        onFavorite={handleFavorite}
                        favorites={favorites}
                        onShowOnMap={handlePhotoSelect}
                        onPhotoHover={setHoveredPhoto}
                        onVisiblePhotosChange={setVisibleGridPhotos}
                        selection={comparisonSelectionKeys}
                        onToggleSelect={handleToggleComparisonSelection}
                      />
                    ) : (
                      <PhotoTimeline
                        photos={filteredPhotos}
                        loading={isLoading}
                        error={error as Error}
                        onFavorite={handleFavorite}
                        favorites={favorites}
                        onShowOnMap={handlePhotoSelect}
                        onPhotoHover={setHoveredPhoto}
                        selection={comparisonSelectionKeys}
                        onToggleSelect={handleToggleComparisonSelection}
                      />
                    )}
                  </Box>
                </>
              )}

              {!searchParams && (
                <Box
                  sx={{
                    textAlign: "center",
                    py: { xs: 4, md: 5 },
                    px: { xs: 2, md: 2.5 },
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  {/* Hero Icon */}
                  <Box
                    sx={{
                      width: { xs: 100, md: 80 },
                      height: { xs: 100, md: 80 },
                      mx: "auto",
                      mb: { xs: 2.5, md: 2 },
                      borderRadius: "50%",
                      background: (theme) =>
                        theme.palette.mode === "dark"
                          ? "linear-gradient(135deg, rgba(0, 77, 64, 0.2) 0%, rgba(16, 185, 129, 0.2) 100%)"
                          : "linear-gradient(135deg, rgba(0, 77, 64, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: (theme) =>
                        theme.palette.mode === "dark" ? "2px solid rgba(0, 77, 64, 0.3)" : "2px solid rgba(0, 77, 64, 0.2)",
                    }}
                  >
                    <SearchIcon sx={{ fontSize: { xs: 50, md: 40 }, color: "primary.main" }} />
                  </Box>

                  {/* Welcome Text */}
                  <Typography
                    variant="h5"
                    gutterBottom
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "1.5rem", md: "1.25rem" },
                      background: (theme) =>
                        theme.palette.mode === "dark"
                          ? "linear-gradient(135deg, #39796b 0%, #10b981 100%)"
                          : "linear-gradient(135deg, #004d40 0%, #10b981 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 1.5,
                      px: 1,
                    }}
                  >
                    Explore Tasmania's Aerial History
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ 
                      mb: 3,
                      lineHeight: 1.6,
                      px: 1,
                      fontSize: { xs: "0.9375rem", md: "0.875rem" },
                    }}
                  >
                    Discover decades of aerial photography from across Tasmania. Search by location, filter by
                    date and scale, and explore the landscape through time.
                  </Typography>

                  {/* Quick Start Cards */}
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                      width: "100%",
                      mt: 2,
                    }}
                  >
                    {[
                      {
                        icon: <SearchIcon sx={{ fontSize: { xs: 28, md: 24 } }} />,
                        title: "Search Any Location",
                        description: "Enter coordinates or search by place name",
                      },
                      {
                        icon: <MapIcon sx={{ fontSize: { xs: 28, md: 24 } }} />,
                        title: "Explore on Map",
                        description: "Click anywhere on the map to discover photos",
                      },
                      {
                        icon: <GridView sx={{ fontSize: { xs: 28, md: 24 } }} />,
                        title: "Filter & Sort",
                        description: "Refine results by date, scale, and image type",
                      },
                    ].map((feature, index) => (
                      <Paper
                        key={index}
                        elevation={1}
                        sx={{
                          p: { xs: 2.5, md: 2 },
                          textAlign: "center",
                          transition: "all 0.2s ease",
                          cursor: "default",
                          borderRadius: 2,
                          border: (theme) =>
                            theme.palette.mode === "dark"
                              ? "1px solid rgba(255, 255, 255, 0.08)"
                              : "1px solid rgba(0, 0, 0, 0.06)",
                          bgcolor: (theme) =>
                            theme.palette.mode === "dark"
                              ? "rgba(255, 255, 255, 0.03)"
                              : "rgba(0, 0, 0, 0.02)",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: (theme) =>
                              theme.palette.mode === "dark"
                                ? "0 4px 12px rgba(0, 0, 0, 0.3)"
                                : "0 4px 12px rgba(0, 77, 64, 0.1)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            color: "primary.main",
                            mb: 1,
                            display: "flex",
                            justifyContent: "center",
                          }}
                        >
                          {feature.icon}
                        </Box>
                        <Typography 
                          variant="subtitle2" 
                          gutterBottom 
                          fontWeight={600} 
                          sx={{ fontSize: { xs: "0.9rem", md: "0.85rem" }, mb: 0.5 }}
                        >
                          {feature.title}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary" 
                          sx={{ fontSize: { xs: "0.8rem", md: "0.75rem" }, lineHeight: 1.4 }}
                        >
                          {feature.description}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>

                  {/* Popular locations hint */}
                  <Box sx={{ mt: { xs: 4, md: 3 }, width: "100%" }}>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      display="block" 
                      mb={1.5}
                      sx={{ fontSize: { xs: "0.75rem", md: "0.7rem" } }}
                    >
                      Popular locations to start:
                    </Typography>
                    <Box sx={{ display: "flex", gap: 0.75, justifyContent: "center", flexWrap: "wrap" }}>
                      {["Hobart", "Launceston", "Devonport", "Burnie"].map((city) => (
                        <Chip
                          key={city}
                          label={city}
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            // Quick location search - you can implement this later
                            console.log("Search for:", city);
                          }}
                          sx={{
                            fontSize: { xs: "0.7rem", md: "0.65rem" },
                            height: { xs: 28, md: 24 },
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              borderColor: "primary.main",
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? "rgba(0, 77, 64, 0.15)" : "rgba(0, 77, 64, 0.08)",
                              transform: "scale(1.05)",
                            },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>

          {/* Right Side - Persistent Map (desktop only, or mobile when map mode active) */}
          <Box
            sx={{
              width: { xs: "100%", md: sidebarOpen ? "calc(100% - 480px)" : "100%" },
              transition: "width 0.3s ease-in-out",
              display: {
                xs: searchParams && viewMode === "map" ? "block" : "none",
                md: "block", // Always show on desktop to contain floating search
              },
              position: "relative",
              minHeight: { xs: "500px", md: "auto" },
            }}
          >
            {/* Floating Search Box - Desktop only */}
            <Box
              sx={{
                display: { xs: "none", md: "block" },
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 1000,
                maxWidth: 400,
                width: "auto",
              }}
            >
              <Box
                sx={{
                  transition: "all 0.3s ease-in-out",
                  transform: searchBoxExpanded ? "translateY(0)" : "translateY(-100%)",
                  opacity: searchBoxExpanded ? 1 : 0,
                  pointerEvents: searchBoxExpanded ? "auto" : "none",
                }}
              >
                <SearchBar onSearch={handleSearch} loading={isLoading} />
              </Box>
              <Stack direction="row" spacing={1} sx={{ position: "absolute", bottom: -48, right: 8 }}>
                <Tooltip title={searchBoxExpanded ? "Hide search" : "Show search"} placement="left">
                  <IconButton
                    onClick={() => setSearchBoxExpanded(!searchBoxExpanded)}
                    sx={{
                      bgcolor: searchBoxExpanded ? "background.paper" : "primary.main",
                      color: searchBoxExpanded ? "text.primary" : "primary.contrastText",
                      boxShadow: 3,
                      border: (theme) => `1px solid ${theme.palette.divider}`,
                      "&:hover": {
                        bgcolor: "primary.main",
                        color: "primary.contrastText",
                        boxShadow: 6,
                        transform: "scale(1.05)",
                      },
                      transition: "all 0.2s ease-in-out",
                    }}
                    size="medium"
                    aria-label={searchBoxExpanded ? "Hide search" : "Show search"}
                  >
                    {searchBoxExpanded ? <ExpandLess /> : <SearchIcon />}
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>

            {searchParams && (
              <Suspense
                fallback={
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      minHeight: "100%",
                      width: "100%",
                      position: "absolute",
                      top: 0,
                      left: 0,
                    }}
                  >
                    <Box sx={{ textAlign: "center" }}>
                      <CircularProgress size={60} />
                      <Typography variant="h6" sx={{ mt: 2, color: "text.secondary" }}>
                        Loading map...
                      </Typography>
                    </Box>
                  </Box>
                }
              >
                <MapView
                  photos={mapPhotos}
                  selectedPhoto={selectedPhoto}
                  hoveredPhoto={hoveredPhoto}
                  onPhotoClick={setSelectedPhoto}
                  onMapClick={handleMapClick}
                  searchCenter={searchCenter}
                  autoZoom={true}
                />
              </Suspense>
            )}
          </Box>
        </Box>

        {/* Version Display - Clickable to show changelog (Desktop only) */}
        <Box
          sx={{
            position: "fixed",
            bottom: 8,
            right: 8,
            zIndex: 1,
            display: { xs: "none", md: "block" },
          }}
        >
          <Typography
            variant="caption"
            onClick={() => setChangelogOpen(true)}
            sx={{
              fontSize: "0.65rem",
              color: "text.disabled",
              opacity: 0.5,
              fontWeight: 500,
              userSelect: "none",
              cursor: "pointer",
              transition: "opacity 0.2s ease-in-out",
              "&:hover": {
                opacity: 1,
                color: "primary.main",
              },
            }}
          >
            v{APP_VERSION}
          </Typography>
        </Box>
      </Box>

      {/* Favorites Modal */}
      <FavoritesModal
        open={favoritesModalOpen}
        onClose={() => setFavoritesModalOpen(false)}
        favoritePhotos={favoritePhotos}
        favorites={favorites}
        onFavorite={handleFavorite}
        onClearAll={handleClearAllFavorites}
        onShowOnMap={(photo) => {
          handlePhotoSelect(photo);
          setFavoritesModalOpen(false);
        }}
      />

      {/* Back to Top Button */}
      <BackToTop />

      <ComparisonFAB
        photos={comparisonSelection}
        onOpenComparison={handleOpenComparisonModal}
        onOpenThenNow={handleOpenThenNowModal}
        onRemove={handleRemoveComparisonPhoto}
        onClear={handleClearComparisonSelection}
        hidden={trayHidden}
      />

      <ComparisonModal
        open={comparisonModalOpen}
        photos={comparisonSelection}
        onClose={() => setComparisonModalOpen(false)}
        onRemovePhoto={handleRemoveComparisonPhoto}
        onClear={handleClearComparisonSelection}
        onSwap={handleSwapComparisonPhotos}
      />

      <ThenNowModal
        open={thenNowModalOpen}
        photo={primaryComparisonPhoto}
        onClose={() => setThenNowModalOpen(false)}
      />

      {/* Mobile Filter Sheet */}
      <MobileFilterSheet
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        availableScales={availableScales}
        dateRange={dateRange}
      />

      {/* Mobile Search Sheet */}
      <MobileSearchSheet
        open={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
        onSearch={handleSearch}
        loading={isLoading}
      />

      {/* Changelog Modal */}
      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

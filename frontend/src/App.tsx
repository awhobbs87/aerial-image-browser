import { useState, useMemo, useCallback, lazy, Suspense, useEffect } from "react";
import {
  ThemeProvider,
  CssBaseline,
  Container,
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
import { GridView, Map as MapIcon, ExpandLess, Search as SearchIcon, Timeline } from "@mui/icons-material";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lightTheme, darkTheme } from "./theme";
import AppBar from "./components/AppBar";
import SearchBar from "./components/SearchBar";
import PhotoGrid from "./components/PhotoGrid";
import PhotoTimeline from "./components/PhotoTimeline";
import FilterPanel, { type Filters } from "./components/FilterPanel";
import FavoritesModal from "./components/FavoritesModal";
import BackToTop from "./components/BackToTop";
import LoadingBar from "./components/LoadingBar";
import ComparisonModal from "./components/ComparisonModal";
import ComparisonTray from "./components/ComparisonTray";
import ThenNowModal from "./components/ThenNowModal";
import { useSearchLocation } from "./hooks/usePhotos";
import type { LocationSearchParams, EnhancedPhoto } from "./types/api";

const APP_VERSION = "1.5.0";

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
type ResultsViewMode = "grid" | "timeline";
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
  const [sidebarWidth, setSidebarWidth] = useState(40); // percentage
  const [isResizing, setIsResizing] = useState(false);
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
  const { data, isLoading, error } = useSearchLocation(searchParams);

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

  const handlePhotoSelect = useCallback((photo: EnhancedPhoto) => {
    setSelectedPhoto(photo);
    // Auto-switch to map view when "Show on map" is clicked
    setViewMode("map");
  }, []);

  const handleMapClick = useCallback(
    (lat: number, lon: number) => {
      // Update search when clicking on map
      handleSearch(lat, lon);
    },
    [handleSearch]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      e.preventDefault();

      const newWidth = (e.clientX / window.innerWidth) * 100;
      // Constrain between 25% and 60%
      if (newWidth >= 25 && newWidth <= 60) {
        setSidebarWidth(newWidth);
      }
    },
    [isResizing]
  );

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

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
          ...(isResizing && {
            userSelect: 'none',
            cursor: 'col-resize',
          }),
        }}
      >
        <AppBar
          darkMode={darkMode}
          themeMode={themeMode}
          onToggleDarkMode={handleToggleDarkMode}
          favoritesCount={favorites.size}
          onViewFavorites={handleViewFavorites}
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
          {/* Left Sidebar - Search, Filters, Results */}
          <Box
            sx={{
              width: { xs: "100%", md: `${sidebarWidth}%` },
              display: "flex",
              flexDirection: "column",
              borderRight: { md: 1 },
              borderColor: { md: "divider" },
              overflowY: "auto",
              maxHeight: { xs: "none", md: "calc(100vh - 64px)" }, // 64px = AppBar height
              position: "relative",
            }}
          >
            {/* Resize handle */}
            <Box
              onMouseDown={handleMouseDown}
              sx={{
                display: { xs: "none", md: "block" },
                position: "absolute",
                right: -2,
                top: 0,
                bottom: 0,
                width: 4,
                cursor: "col-resize",
                bgcolor: "transparent",
                zIndex: 1001,
                userSelect: 'none',
                "&:hover": {
                  bgcolor: "primary.main",
                  opacity: 0.5,
                },
                ...(isResizing && {
                  bgcolor: "primary.main",
                  opacity: 0.7,
                }),
              }}
            />
            <Container maxWidth="lg" sx={{ py: 2, flexGrow: 1 }}>
              {/* Search Bar - Mobile only in sidebar, Desktop in floating box on map */}
              <Box sx={{ mb: 2, display: { xs: "block", md: "none" } }}>
                <SearchBar onSearch={handleSearch} loading={isLoading} />
              </Box>

              {searchParams && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <FilterPanel
                      filters={filters}
                      onFiltersChange={setFilters}
                      availableScales={availableScales}
                      dateRange={dateRange}
                    />
                  </Box>

                  {/* Mobile-only View Toggle */}
                  <Box sx={{ display: { xs: "flex", md: "none" }, justifyContent: "center", mb: 3 }}>
                    <Paper elevation={1}>
                      <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={handleViewModeChange}
                        aria-label="view mode"
                        size="small"
                      >
                        <ToggleButton value="grid" aria-label="grid view">
                          <GridView sx={{ mr: 1 }} />
                          Grid
                        </ToggleButton>
                        <ToggleButton value="map" aria-label="map view">
                          <MapIcon sx={{ mr: 1 }} />
                          Map
                        </ToggleButton>
                      </ToggleButtonGroup>
                    </Paper>
                  </Box>

                  {/* Results Grid (always visible on desktop, conditional on mobile) */}
                  <Box sx={{ display: { xs: viewMode === "grid" ? "block" : "none", md: "block" } }}>
                    {filteredPhotos.length > 0 && (
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={2}
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                      >
                        <ToggleButtonGroup
                          value={resultsViewMode}
                          exclusive
                          onChange={handleResultsViewModeChange}
                          size="small"
                          aria-label="results view mode"
                        >
                          <ToggleButton value="grid" aria-label="grid results view">
                            <GridView sx={{ mr: 1 }} fontSize="small" />
                            Grid
                          </ToggleButton>
                          <ToggleButton value="timeline" aria-label="timeline results view">
                            <Timeline sx={{ mr: 1 }} fontSize="small" />
                            Timeline
                          </ToggleButton>
                        </ToggleButtonGroup>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="contained"
                            color="secondary"
                            startIcon={<CompareArrowsIcon />}
                            disabled={comparisonSelection.length === 0}
                            onClick={handleOpenComparisonModal}
                          >
                            Compare ({comparisonSelection.length}/2)
                          </Button>
                          <Button
                            variant="outlined"
                            disabled={comparisonSelection.length === 0}
                            onClick={handleOpenThenNowModal}
                          >
                            Then vs Now
                          </Button>
                        </Stack>
                      </Stack>
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

                    {resultsViewMode === "grid" ? (
                      <PhotoGrid
                        photos={filteredPhotos}
                        loading={isLoading}
                        error={error as Error}
                        onFavorite={handleFavorite}
                        favorites={favorites}
                        onShowOnMap={handlePhotoSelect}
                        onPhotoHover={setHoveredPhoto}
                        onVisiblePhotosChange={setVisibleGridPhotos}
                        sidebarWidth={sidebarWidth}
                        comparisonSelection={comparisonSelectionKeys}
                        onToggleCompare={handleToggleComparisonSelection}
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
                        comparisonSelection={comparisonSelectionKeys}
                        onToggleCompare={handleToggleComparisonSelection}
                      />
                    )}
                  </Box>
                </>
              )}

              {!searchParams && (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 6,
                    px: 3,
                  }}
                >
                  {/* Hero Icon */}
                  <Box
                    sx={{
                      width: 120,
                      height: 120,
                      mx: "auto",
                      mb: 3,
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
                    <SearchIcon sx={{ fontSize: 60, color: "primary.main" }} />
                  </Box>

                  {/* Welcome Text */}
                  <Typography
                    variant="h4"
                    gutterBottom
                    sx={{
                      fontWeight: 700,
                      background: (theme) =>
                        theme.palette.mode === "dark"
                          ? "linear-gradient(135deg, #39796b 0%, #10b981 100%)"
                          : "linear-gradient(135deg, #004d40 0%, #10b981 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      mb: 2,
                    }}
                  >
                    Explore Tasmania's Aerial History
                  </Typography>

                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ maxWidth: 600, mx: "auto", mb: 4, lineHeight: 1.7 }}
                  >
                    Discover decades of aerial photography from across Tasmania. Search by location, filter by
                    date and scale, and explore the landscape through time.
                  </Typography>

                  {/* Quick Start Cards */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
                      gap: 2,
                      maxWidth: 800,
                      mx: "auto",
                      mt: 4,
                    }}
                  >
                    {[
                      {
                        icon: <SearchIcon sx={{ fontSize: 32 }} />,
                        title: "Search Any Location",
                        description: "Enter coordinates or search by place name",
                      },
                      {
                        icon: <MapIcon sx={{ fontSize: 32 }} />,
                        title: "Explore on Map",
                        description: "Click anywhere on the map to discover photos",
                      },
                      {
                        icon: <GridView sx={{ fontSize: 32 }} />,
                        title: "Filter & Sort",
                        description: "Refine results by date, scale, and image type",
                      },
                    ].map((feature, index) => (
                      <Paper
                        key={index}
                        elevation={2}
                        sx={{
                          p: 3,
                          textAlign: "center",
                          transition: "all 0.3s ease",
                          cursor: "default",
                          borderRadius: 3,
                          border: (theme) =>
                            theme.palette.mode === "dark"
                              ? "1px solid rgba(255, 255, 255, 0.1)"
                              : "1px solid rgba(0, 0, 0, 0.08)",
                          "&:hover": {
                            transform: "translateY(-4px)",
                            boxShadow: (theme) =>
                              theme.palette.mode === "dark"
                                ? "0 12px 24px rgba(0, 0, 0, 0.5)"
                                : "0 12px 24px rgba(0, 77, 64, 0.15)",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            color: "primary.main",
                            mb: 1.5,
                          }}
                        >
                          {feature.icon}
                        </Box>
                        <Typography variant="h6" gutterBottom fontWeight={600} fontSize="0.95rem">
                          {feature.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                          {feature.description}
                        </Typography>
                      </Paper>
                    ))}
                  </Box>

                  {/* Popular locations hint */}
                  <Box sx={{ mt: 5 }}>
                    <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                      Popular locations to start:
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
                      {["Hobart", "Launceston", "Devonport", "Burnie"].map((city) => (
                        <Chip
                          key={city}
                          label={city}
                          size="small"
                          variant="outlined"
                          sx={{
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            "&:hover": {
                              borderColor: "primary.main",
                              bgcolor: (theme) =>
                                theme.palette.mode === "dark" ? "rgba(0, 77, 64, 0.1)" : "rgba(0, 77, 64, 0.05)",
                            },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              )}
            </Container>
          </Box>

          {/* Right Side - Persistent Map (desktop only, or mobile when map mode active) */}
          <Box
            sx={{
              width: { xs: "100%", md: `${100 - sidebarWidth}%` },
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
              <Tooltip title={searchBoxExpanded ? "Hide search" : "Show search"} placement="left">
                <IconButton
                  onClick={() => setSearchBoxExpanded(!searchBoxExpanded)}
                  sx={{
                    position: "absolute",
                    bottom: -48,
                    right: 8,
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

        {/* Version Display - Subtle footer */}
        <Box
          sx={{
            position: "fixed",
            bottom: 8,
            right: 8,
            zIndex: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.65rem",
              color: "text.disabled",
              opacity: 0.5,
              fontWeight: 500,
              userSelect: "none",
              transition: "opacity 0.2s ease-in-out",
              "&:hover": {
                opacity: 0.8,
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

      <ComparisonTray
        photos={comparisonSelection}
        onOpen={handleOpenComparisonModal}
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
      />

      <ThenNowModal
        open={thenNowModalOpen}
        photo={primaryComparisonPhoto}
        onClose={() => setThenNowModalOpen(false)}
      />
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

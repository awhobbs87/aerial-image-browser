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
} from "@mui/material";
import { GridView, Map as MapIcon, ExpandLess, Search as SearchIcon } from "@mui/icons-material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lightTheme, darkTheme } from "./theme";
import AppBar from "./components/AppBar";
import SearchBar from "./components/SearchBar";
import PhotoGrid from "./components/PhotoGrid";
import FilterPanel, { type Filters } from "./components/FilterPanel";
import { useSearchLocation } from "./hooks/usePhotos";
import type { LocationSearchParams, EnhancedPhoto } from "./types/api";

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
type ThemeMode = "light" | "dark" | "system";

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
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedPhoto, setSelectedPhoto] = useState<EnhancedPhoto | null>(null);
  const [hoveredPhoto, setHoveredPhoto] = useState<EnhancedPhoto | null>(null);
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);
  const [searchBoxExpanded, setSearchBoxExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(40); // percentage
  const [isResizing, setIsResizing] = useState(false);
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

  // Filter photos by selected scales (client-side)
  const filteredPhotos = useMemo(() => {
    if (!data?.photos) return [];
    if (filters.selectedScales.length === 0) return data.photos;

    return data.photos.filter(photo =>
      photo.SCALE && filters.selectedScales.includes(photo.SCALE)
    );
  }, [data?.photos, filters.selectedScales]);

  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

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

  const handleViewModeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
      if (newMode !== null) {
        setViewMode(newMode);
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
        <AppBar darkMode={darkMode} themeMode={themeMode} onToggleDarkMode={handleToggleDarkMode} />

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
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                availableScales={availableScales}
              />

              {searchParams && (
                <>
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
                    <PhotoGrid
                      photos={filteredPhotos}
                      loading={isLoading}
                      error={error as Error}
                      onFavorite={handleFavorite}
                      favorites={favorites}
                      onShowOnMap={handlePhotoSelect}
                      onPhotoHover={setHoveredPhoto}
                    />
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
            {/* Floating Search Box - Always visible */}
            <Box
              sx={{
                position: "absolute",
                top: 16,
                right: 16,
                zIndex: 1000,
                maxWidth: 400,
                width: { xs: "calc(100% - 32px)", sm: "auto" },
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
                  photos={filteredPhotos}
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
      </Box>
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

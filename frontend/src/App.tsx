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
} from "@mui/material";
import { GridView, Map as MapIcon } from "@mui/icons-material";
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
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null);
  const [filters, setFilters] = useState<Filters>({
    startDate: null,
    endDate: null,
    minScale: null,
    maxScale: null,
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

      setSearchParams({
        lat,
        lon,
        layers: [0, 1, 2],
        startDate: filters.startDate?.toISOString(),
        endDate: filters.endDate?.toISOString(),
        minScale: filters.minScale,
        maxScale: filters.maxScale,
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
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
              width: { xs: "100%", md: "40%" },
              display: "flex",
              flexDirection: "column",
              borderRight: { md: 1 },
              borderColor: { md: "divider" },
              overflowY: "auto",
              maxHeight: { xs: "none", md: "calc(100vh - 64px)" }, // 64px = AppBar height
            }}
          >
            <Container maxWidth="lg" sx={{ py: 2, flexGrow: 1 }}>
              <SearchBar onSearch={handleSearch} loading={isLoading} />
              <FilterPanel filters={filters} onFiltersChange={setFilters} />

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
                      photos={data?.photos || []}
                      loading={isLoading}
                      error={error as Error}
                      onFavorite={handleFavorite}
                      favorites={favorites}
                      onShowOnMap={handlePhotoSelect}
                    />
                  </Box>
                </>
              )}

              {!searchParams && (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 8,
                    px: 2,
                  }}
                >
                  <Typography variant="h4" gutterBottom color="text.secondary">
                    Welcome to Tasmania Aerial Photos
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ maxWidth: 600, mx: "auto" }}
                  >
                    Search for historical and recent aerial photography from across Tasmania. Enter
                    coordinates or select a location above to get started.
                  </Typography>
                </Box>
              )}
            </Container>
          </Box>

          {/* Right Side - Persistent Map (desktop only, or mobile when map mode active) */}
          <Box
            sx={{
              width: { xs: "100%", md: "60%" },
              display: {
                xs: searchParams && viewMode === "map" ? "block" : "none",
                md: searchParams ? "block" : "none",
              },
              position: "relative",
              minHeight: { xs: "500px", md: "auto" },
            }}
          >
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
                  photos={data?.photos || []}
                  selectedPhoto={selectedPhoto}
                  onPhotoClick={setSelectedPhoto}
                  onMapClick={handleMapClick}
                  searchCenter={searchCenter}
                  autoZoom={true}
                />
              </Suspense>
            )}
          </Box>
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 3,
            px: 2,
            mt: "auto",
            backgroundColor: (theme) =>
              theme.palette.mode === "light" ? theme.palette.grey[200] : theme.palette.grey[800],
          }}
        >
          <Container maxWidth="xl">
            <Typography variant="body2" color="text.secondary" align="center">
              Data source: Tasmania DPIPWE ArcGIS REST API
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 0.5 }}>
              © {new Date().getFullYear()} Tasmania Aerial Photo Browser
            </Typography>
          </Container>
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

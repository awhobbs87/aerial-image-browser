import { useState, useMemo } from "react";
import {
  ThemeProvider,
  CssBaseline,
  Container,
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Paper,
} from "@mui/material";
import { GridView, Map as MapIcon } from "@mui/icons-material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lightTheme, darkTheme } from "./theme";
import AppBar from "./components/AppBar";
import SearchBar from "./components/SearchBar";
import PhotoGrid from "./components/PhotoGrid";
import MapView from "./components/MapView";
import FilterPanel, { type Filters } from "./components/FilterPanel";
import { useSearchLocation } from "./hooks/usePhotos";
import type { LocationSearchParams, EnhancedPhoto } from "./types/api";

// Create Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type ViewMode = "grid" | "map";

function AppContent() {
  const [darkMode, setDarkMode] = useState(false);
  const [searchParams, setSearchParams] = useState<LocationSearchParams | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedPhoto, setSelectedPhoto] = useState<EnhancedPhoto | null>(null);
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

  // Use React Query hook for fetching photos
  const { data, isLoading, error } = useSearchLocation(searchParams);

  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleSearch = (lat: number, lon: number, locationName?: string) => {
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

    // Store location name for display (optional)
    if (locationName) {
      console.log("Searching for:", locationName);
    }
  };

  const handleFavorite = (photo: EnhancedPhoto) => {
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
  };

  const handleViewModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
    if (newMode !== null) {
      setViewMode(newMode);
    }
  };

  const handlePhotoSelect = (photo: EnhancedPhoto) => {
    setSelectedPhoto(photo);
    // Auto-switch to map view when "Show on map" is clicked
    setViewMode("map");
  };

  const handleMapClick = (lat: number, lon: number) => {
    // Update search when clicking on map
    handleSearch(lat, lon);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <AppBar darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />

        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
          <SearchBar onSearch={handleSearch} loading={isLoading} />

          <FilterPanel filters={filters} onFiltersChange={setFilters} />

          {searchParams && (
            <>
              {/* View Toggle */}
              <Box sx={{ display: "flex", justifyContent: "center", mb: 3 }}>
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

              {/* Conditional rendering based on view mode */}
              {viewMode === "grid" ? (
                <PhotoGrid
                  photos={data?.photos || []}
                  loading={isLoading}
                  error={error as Error}
                  onFavorite={handleFavorite}
                  favorites={favorites}
                  onShowOnMap={handlePhotoSelect}
                />
              ) : (
                <MapView
                  photos={data?.photos || []}
                  selectedPhoto={selectedPhoto}
                  onPhotoClick={setSelectedPhoto}
                  onMapClick={handleMapClick}
                />
              )}
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
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, mx: "auto" }}>
                Search for historical and recent aerial photography from across Tasmania. Enter
                coordinates or select a location above to get started.
              </Typography>
            </Box>
          )}
        </Container>

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

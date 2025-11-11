import { useState, useMemo } from "react";
import { ThemeProvider, CssBaseline, Container, Box, Typography } from "@mui/material";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lightTheme, darkTheme } from "./theme";
import AppBar from "./components/AppBar";
import SearchBar from "./components/SearchBar";
import PhotoGrid from "./components/PhotoGrid";
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

function AppContent() {
  const [darkMode, setDarkMode] = useState(false);
  const [searchParams, setSearchParams] = useState<LocationSearchParams | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Use React Query hook for fetching photos
  const { data, isLoading, error } = useSearchLocation(searchParams);

  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleSearch = (lat: number, lon: number) => {
    setSearchParams({
      lat,
      lon,
      layers: [0, 1, 2],
    });
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <AppBar darkMode={darkMode} onToggleDarkMode={handleToggleDarkMode} />

        <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
          <SearchBar onSearch={handleSearch} loading={isLoading} />

          {searchParams && (
            <PhotoGrid
              photos={data?.photos || []}
              loading={isLoading}
              error={error as Error}
              onFavorite={handleFavorite}
              favorites={favorites}
            />
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

import {
  useState,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  useEffect,
} from "react";
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
import {
  appleLiquidGlass,
  getThemeValue,
  createBackdropFilter,
} from "./theme/apple-liquid-glass";
import AppBar from "./components/AppBar";
import SearchBar from "./components/SearchBar";
import PhotoGrid from "./components/PhotoGrid";
import PhotoTimeline from "./components/PhotoTimeline";
import FilterPanel from "./components/FilterPanel";
import { FILTER_PRESETS, type Filters } from "./components/filterPanelConfig";
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
// New redesigned components
import GlassNavigation from "./components/GlassNavigation";
import DiscoveryTray from "./components/DiscoveryTray";
import FloatingSearchBar from "./components/FloatingSearchBar";
import ResultsPanel from "./components/ResultsPanel";
import AISearchModal from "./components/AISearchModal";

const APP_VERSION = "3.0.0";

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
type LayoutMode = "classic" | "immersive";
type DiscoveryPanel = "search" | "layers" | "history" | null;
const getPhotoKey = (photo: EnhancedPhoto) =>
  `${photo.layerId}-${photo.OBJECTID}`;

// Helper function to get the initial theme preference
const getInitialTheme = (): ThemeMode => {
  const stored = localStorage.getItem("themeMode");
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }
  return "system";
};

// Helper function to determine if dark mode should be active
const shouldUseDarkMode = (
  themeMode: ThemeMode,
  prefersDark: boolean,
): boolean => {
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
    [themeMode, prefersDarkMode],
  );

  const [searchParams, setSearchParams] = useState<LocationSearchParams | null>(
    null,
  );
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoritesModalOpen, setFavoritesModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [resultsViewMode, setResultsViewMode] =
    useState<ResultsViewMode>("grid");
  const [selectedPhoto, setSelectedPhoto] = useState<EnhancedPhoto | null>(
    null,
  );
  const [hoveredPhoto, setHoveredPhoto] = useState<EnhancedPhoto | null>(null);
  const [visibleGridPhotos, setVisibleGridPhotos] = useState<EnhancedPhoto[]>(
    [],
  );
  const [searchCenter, setSearchCenter] = useState<[number, number] | null>(
    null,
  );
  const [searchBoxExpanded, setSearchBoxExpanded] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [comparisonSelection, setComparisonSelection] = useState<
    EnhancedPhoto[]
  >([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [thenNowModalOpen, setThenNowModalOpen] = useState(false);
  const [pendingPin, setPendingPin] = useState<[number, number] | null>(null);
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

  // Immersive layout mode (new glassmorphic design)
  const [layoutMode, _setLayoutMode] = useState<LayoutMode>("immersive");
  const [discoveryPanel, setDiscoveryPanel] = useState<DiscoveryPanel>(null);
  const [discoveryTrayExpanded, setDiscoveryTrayExpanded] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [searchedLocationName, setSearchedLocationName] = useState<
    string | null
  >(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [appliedAIFilters, setAppliedAIFilters] = useState<{
    dateRange?: { start?: string; end?: string };
    resolution?: string;
    imageTypes?: string[];
  } | null>(null);
  // Store location coords for re-searching when clearing AI filters
  const [lastSearchCoords, setLastSearchCoords] = useState<{
    lat: number;
    lon: number;
    name?: string;
  } | null>(null);

  // Persist theme preference to localStorage
  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  // Fetch user email from Cloudflare Access on mount
  // Worker is now in the same Access application, so the cookie will be sent
  useEffect(() => {
    const fetchUserEmail = async () => {
      try {
        // Use Worker URL directly with credentials to send Access cookie
        const response = await fetch(
          "https://tas-aerial-browser.awhobbs.workers.dev/api/me",
          { credentials: "include" },
        );
        if (response.ok) {
          const data = (await response.json()) as {
            success: boolean;
            data?: { email: string };
          };
          if (data.success && data.data?.email) {
            setUserEmail(data.data.email);
          }
        }
      } catch {
        // Silently fail - user might not be authenticated
      }
    };
    fetchUserEmail();
  }, []);

  // Keyboard shortcut: Escape to cancel pending pin
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && pendingPin) {
        setPendingPin(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingPin]);

  // Use React Query hook for fetching photos
  const { data, isLoading, error } = useSearchLocation(searchParams);

  // Extract available scales from fetched photos
  const availableScales = useMemo(() => {
    if (!data?.photos) return [];
    const scalesSet = new Set<number>();
    data.photos.forEach((photo) => {
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
      .map((photo) =>
        photo.FLY_DATE ? new Date(photo.FLY_DATE).getFullYear() : null,
      )
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
      photos = photos.filter((photo) => {
        if (!photo.FLY_DATE) return false;
        const photoDate = new Date(photo.FLY_DATE);
        if (filters.startDate && photoDate < filters.startDate) return false;
        if (filters.endDate && photoDate > filters.endDate) return false;
        return true;
      });
    }

    // Filter by scale if specified
    if (filters.selectedScales.length > 0) {
      photos = photos.filter(
        (photo) => photo.SCALE && filters.selectedScales.includes(photo.SCALE),
      );
    }

    // Filter by layer type if toggled
    const { aerial, ortho, digital } = filters.layerTypes;
    if (!aerial || !ortho || !digital) {
      photos = photos.filter((photo) => {
        if (photo.layerType === "aerial") return aerial;
        if (photo.layerType === "ortho") return ortho;
        return digital;
      });
    }

    return photos;
  }, [
    data?.photos,
    filters.selectedScales,
    filters.startDate,
    filters.endDate,
    filters.layerTypes,
  ]);

  // Get favorite photos for modal
  const favoritePhotos = useMemo(() => {
    if (!data?.photos) return [];
    return data.photos.filter((photo) =>
      favorites.has(`${photo.layerId}-${photo.OBJECTID}`),
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
      visibleGridPhotos.map((p) => `${p.layerId}-${p.OBJECTID}`),
    );

    // Put visible photos first, then fill with remaining filtered photos
    const remainingPhotos = filteredPhotos.filter(
      (p) => !visibleIds.has(`${p.layerId}-${p.OBJECTID}`),
    );

    return [...visibleGridPhotos, ...remainingPhotos];
  }, [visibleGridPhotos, filteredPhotos]);

  const theme = useMemo(() => (darkMode ? darkTheme : lightTheme), [darkMode]);
  const comparisonSelectionKeys = useMemo(
    () => new Set(comparisonSelection.map((photo) => getPhotoKey(photo))),
    [comparisonSelection],
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
    (
      lat: number,
      lon: number,
      locationName?: string,
      aiFilters?: {
        startDate?: string;
        endDate?: string;
        imageTypes?: string[];
        minScale?: number;
        maxScale?: number;
      },
    ) => {
      // If AI provided filters, use those; otherwise use panel filters
      let startDate: string | undefined;
      let endDate: string | undefined;
      let imageTypes: string[] | undefined;
      let minScale: number | undefined;
      let maxScale: number | undefined;

      if (
        aiFilters &&
        (aiFilters.startDate ||
          aiFilters.endDate ||
          aiFilters.imageTypes ||
          aiFilters.minScale ||
          aiFilters.maxScale)
      ) {
        // Use AI-provided filters
        startDate = aiFilters.startDate;
        endDate = aiFilters.endDate;
        imageTypes = aiFilters.imageTypes;
        minScale = aiFilters.minScale;
        maxScale = aiFilters.maxScale;
        console.log("Using AI filters:", aiFilters);
      } else {
        // Use panel filters
        const activeLayerTypes = [];
        if (filters.layerTypes.aerial) activeLayerTypes.push("aerial");
        if (filters.layerTypes.ortho) activeLayerTypes.push("ortho");
        if (filters.layerTypes.digital) activeLayerTypes.push("digital");

        startDate = filters.startDate?.toISOString();
        endDate = filters.endDate?.toISOString();
        imageTypes =
          activeLayerTypes.length === 3 ? undefined : activeLayerTypes;

        // Derive scale bounds for server-side filtering (exact selection enforced client-side)
        const hasScaleSelection = filters.selectedScales.length > 0;
        minScale = hasScaleSelection
          ? Math.min(...filters.selectedScales)
          : undefined;
        maxScale = hasScaleSelection
          ? Math.max(...filters.selectedScales)
          : undefined;
      }

      setSearchParams({
        lat,
        lon,
        layers: [0, 1, 2],
        startDate,
        endDate,
        imageTypes,
        minScale,
        maxScale,
      });

      // Set search center for map to zoom to
      setSearchCenter([lat, lon]);

      // Store location name for display (optional)
      if (locationName) {
        console.log("Searching for:", locationName);
      }
    },
    [filters],
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
    if (
      window.confirm(
        `Are you sure you want to remove all ${favorites.size} favorites?`,
      )
    ) {
      setFavorites(new Set());
    }
  }, [favorites.size]);

  const handleViewModeChange = useCallback(
    (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode | null) => {
      if (newMode !== null) {
        setViewMode(newMode);
      }
    },
    [],
  );

  const handleResultsViewModeChange = useCallback(
    (
      _event: React.MouseEvent<HTMLElement>,
      newMode: ResultsViewMode | null,
    ) => {
      if (newMode) {
        setResultsViewMode(newMode);
      }
    },
    [],
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
        if (
          newValue === "grid" ||
          newValue === "timeline" ||
          newValue === "gallery"
        ) {
          setResultsViewMode(newValue as ResultsViewMode);
        }
      }
    },
    [],
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
    // Set pending pin instead of immediate search
    setPendingPin([lat, lon]);
  }, []);

  const handleConfirmPin = useCallback(() => {
    if (pendingPin) {
      handleSearch(pendingPin[0], pendingPin[1]);
      setPendingPin(null);
    }
  }, [pendingPin, handleSearch]);

  const handleCancelPin = useCallback(() => {
    setPendingPin(null);
  }, []);

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
    [availableScales],
  );

  useEffect(() => {
    if (!data?.photos) {
      setComparisonSelection([]);
      return;
    }
    const available = new Set(data.photos.map((photo) => getPhotoKey(photo)));
    setComparisonSelection((prev) =>
      prev.filter((photo) => available.has(getPhotoKey(photo))),
    );
  }, [data?.photos]);

  const handleToggleComparisonSelection = useCallback(
    (photo: EnhancedPhoto) => {
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
    },
    [],
  );

  const handleRemoveComparisonPhoto = useCallback((photoKey: string) => {
    setComparisonSelection((prev) =>
      prev.filter((photo) => getPhotoKey(photo) !== photoKey),
    );
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

  // Handle AI search modal from floating search bar
  const handleAISearchClick = useCallback(() => {
    setAiModalOpen(true);
  }, []);

  // Handler for floating search bar
  const handleFloatingSearch = useCallback(
    (lat: number, lon: number, name: string) => {
      setSearchedLocationName(name);
      handleSearch(lat, lon, name);
    },
    [handleSearch],
  );

  // Handler for AI search from modal
  const handleAISearch = useCallback(
    (
      lat: number,
      lon: number,
      locationName?: string,
      filters?: {
        startDate?: string;
        endDate?: string;
        imageTypes?: string[];
        minScale?: number;
        maxScale?: number;
        resolution?: string;
      },
    ) => {
      setAiModalOpen(false);
      setSearchedLocationName(locationName || "AI Search Result");

      // Store AI filters for display in banner
      if (filters) {
        const aiFilters: {
          dateRange?: { start?: string; end?: string };
          resolution?: string;
          imageTypes?: string[];
        } = {};

        if (filters.startDate || filters.endDate) {
          aiFilters.dateRange = {
            start: filters.startDate,
            end: filters.endDate,
          };
        }
        if (filters.resolution) {
          aiFilters.resolution = filters.resolution;
        }
        if (filters.imageTypes && filters.imageTypes.length > 0) {
          aiFilters.imageTypes = filters.imageTypes;
        }

        // Only set if we have any filters
        if (Object.keys(aiFilters).length > 0) {
          setAppliedAIFilters(aiFilters);
        } else {
          setAppliedAIFilters(null);
        }
      } else {
        setAppliedAIFilters(null);
      }

      // Store coords for potential re-search when clearing AI filters
      setLastSearchCoords({ lat, lon, name: locationName });

      handleSearch(lat, lon, locationName, filters);
    },
    [handleSearch],
  );

  // Handler to clear AI filters and re-search with defaults
  const handleClearAIFilters = useCallback(() => {
    setAppliedAIFilters(null);
    if (lastSearchCoords) {
      // Re-search the same location without AI filters
      handleSearch(
        lastSearchCoords.lat,
        lastSearchCoords.lon,
        lastSearchCoords.name,
      );
    }
  }, [lastSearchCoords, handleSearch]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      {/* Loading Progress Bar */}
      <LoadingBar loading={isLoading} />

      {/* IMMERSIVE LAYOUT - Full-screen map with floating UI */}
      {layoutMode === "immersive" ? (
        <Box
          sx={{
            position: "relative",
            width: "100vw",
            height: "100vh",
            overflow: "hidden",
            bgcolor: "#121212",
          }}
        >
          {/* Full-Screen Map Background */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
            }}
          >
            <Suspense
              fallback={
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    bgcolor: "#121212",
                  }}
                >
                  <CircularProgress sx={{ color: "#10B981" }} />
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
                pendingPin={pendingPin}
                onConfirmPin={handleConfirmPin}
                onCancelPin={handleCancelPin}
              />
            </Suspense>
          </Box>

          {/* Glass Navigation Bar */}
          <GlassNavigation
            onSavedClick={handleViewFavorites}
            savedCount={favorites.size}
            userEmail={userEmail || undefined}
          />

          {/* Discovery Tray (Left sidebar icons) */}
          <DiscoveryTray
            activePanel={discoveryPanel}
            onPanelChange={setDiscoveryPanel}
            expanded={discoveryTrayExpanded}
            onExpandedChange={setDiscoveryTrayExpanded}
          />

          {/* Floating Search Bar (centered at top) */}
          <FloatingSearchBar
            onSearch={handleFloatingSearch}
            onAISearchClick={handleAISearchClick}
            loading={isLoading}
          />

          {/* Results Panel (slides in from left when we have results) */}
          {searchParams && filteredPhotos.length > 0 && (
            <ResultsPanel
              photos={filteredPhotos}
              loading={isLoading}
              error={error as Error | null}
              favorites={favorites}
              onFavorite={handleFavorite}
              onShowOnMap={handlePhotoSelect}
              onPhotoHover={setHoveredPhoto}
              onVisiblePhotosChange={setVisibleGridPhotos}
              comparisonSelection={comparisonSelectionKeys}
              onToggleComparisonSelection={handleToggleComparisonSelection}
              comparisonPhotos={comparisonSelection}
              onOpenComparison={handleOpenComparisonModal}
              onOpenThenNow={handleOpenThenNowModal}
              onClearComparison={handleClearComparisonSelection}
              filters={filters}
              onFiltersChange={setFilters}
              availableScales={availableScales}
              dateRange={dateRange}
              hasActiveFilters={hasActiveFilters}
              onQuickFilterPreset={handleQuickFilterPreset}
              searchedLocation={searchedLocationName}
              appliedAIFilters={appliedAIFilters}
              onClearAIFilters={handleClearAIFilters}
            />
          )}

          {/* Welcome overlay when no search */}
          {!searchParams && (
            <Box
              sx={{
                position: "absolute",
                bottom: { xs: 16, sm: 32 },
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 100,
                textAlign: "center",
                maxWidth: { xs: "100%", sm: 480 },
                px: { xs: 2, sm: 3 },
                width: "100%",
              }}
            >
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  color: "#F1F5F9",
                  textShadow: "0 2px 12px rgba(0, 0, 0, 0.5)",
                  mb: { xs: 0.5, sm: 1 },
                  letterSpacing: "-0.02em",
                  fontSize: { xs: "1.5rem", sm: "2rem", md: "2.125rem" },
                }}
              >
                Tasmania Aerial Photos
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(241, 245, 249, 0.75)",
                  textShadow: "0 1px 8px rgba(0, 0, 0, 0.5)",
                  fontSize: { xs: "0.8rem", sm: "0.9rem" },
                  lineHeight: 1.5,
                  // Shorter text on mobile
                  display: { xs: "none", sm: "block" },
                }}
              >
                Explore decades of aerial photography. Search a location or
                click anywhere on the map to discover historical imagery.
              </Typography>
              {/* Mobile-only shorter text */}
              <Typography
                variant="body2"
                sx={{
                  color: "rgba(241, 245, 249, 0.7)",
                  textShadow: "0 1px 8px rgba(0, 0, 0, 0.5)",
                  fontSize: "0.75rem",
                  display: { xs: "block", sm: "none" },
                }}
              >
                Search or tap the map to explore
              </Typography>
            </Box>
          )}

          {/* Version badge */}
          <Typography
            variant="caption"
            onClick={() => setChangelogOpen(true)}
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              zIndex: 100,
              fontSize: "0.65rem",
              color: "rgba(148, 163, 184, 0.5)",
              cursor: "pointer",
              transition: "color 0.2s ease",
              "&:hover": {
                color: "#10B981",
              },
            }}
          >
            v{APP_VERSION}
          </Typography>

          {/* AI Search Modal */}
          <AISearchModal
            open={aiModalOpen}
            onClose={() => setAiModalOpen(false)}
            onSearch={handleAISearch}
          />
        </Box>
      ) : (
        /* CLASSIC LAYOUT - Original two-column design */
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
                  md: sidebarOpen ? "480px" : 0,
                },
                display: {
                  xs: "block",
                  md: sidebarOpen ? "flex" : "none",
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
                const isAtBottom =
                  target.scrollTop + target.clientHeight >=
                  target.scrollHeight - 1;

                if (isScrolling) {
                  // If we're scrolling within the sidebar, stop propagation
                  if (
                    !(isAtTop && e.deltaY < 0) &&
                    !(isAtBottom && e.deltaY > 0)
                  ) {
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
                  py: { xs: 1.5, md: 2 },
                  px: { xs: 1.5, md: 3 },
                  maxWidth: "100%",
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                }}
              >
                {/* Mobile Search Button - Show button after search, hide search bar */}
                {searchParams && (
                  <Box
                    sx={{
                      mb: { xs: 1.5, md: 2 },
                      display: { xs: "block", md: "none" },
                    }}
                  >
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => setMobileSearchOpen(true)}
                      startIcon={<SearchIcon />}
                      sx={{
                        py: { xs: 1, md: 1.5 },
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        minHeight: { xs: 40, md: 48 },
                      }}
                    >
                      Search Location
                    </Button>
                  </Box>
                )}

                {/* Search Bar - Mobile only when no search yet, Desktop in floating box on map */}
                {!searchParams && (
                  <Box
                    sx={{
                      mb: { xs: 1.5, md: 2 },
                      display: { xs: "block", md: "none" },
                    }}
                  >
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
                    <Box
                      sx={{
                        mb: { xs: 1.5, md: 2 },
                        display: { xs: "block", md: "none" },
                      }}
                    >
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => setMobileFilterOpen(true)}
                        startIcon={<FilterList />}
                        sx={{
                          py: { xs: 1, md: 1.5 },
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          minHeight: { xs: 40, md: 48 },
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

                    {/* Comparison Tools - Compact, Active Design */}
                    <Box
                      sx={{
                        mb: 2,
                        display: { xs: "none", md: "block" },
                        // Apple Liquid Glass: Frosted glass with subtle elevation
                        bgcolor: (theme) =>
                          getThemeValue(
                            appleLiquidGlass.backgrounds.frosted,
                            theme.palette.mode === "dark",
                          ),
                        ...createBackdropFilter(
                          appleLiquidGlass.backdrop.module,
                        ),
                        borderRadius: appleLiquidGlass.radius.medium,
                        px: 1.5,
                        py: 1,
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
                          return `${shadows.medium}, ${shadows.innerFrosted}`;
                        },
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: appleLiquidGlass.typography.hint.fontSize,
                            fontWeight: 500,
                            color: (theme) =>
                              getThemeValue(
                                appleLiquidGlass.text.secondary,
                                theme.palette.mode === "dark",
                              ),
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {comparisonSelection.length === 0
                            ? "Select photos to compare"
                            : comparisonSelection.length === 1
                              ? "Select another photo or use Then vs Now"
                              : "Ready to compare"}
                        </Typography>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          sx={{ flexShrink: 0 }}
                        >
                          <Button
                            variant={
                              comparisonSelection.length >= 2
                                ? "contained"
                                : "outlined"
                            }
                            color="primary"
                            size="small"
                            startIcon={<CompareArrowsIcon fontSize="small" />}
                            disabled={comparisonSelection.length < 2}
                            onClick={handleOpenComparisonModal}
                            sx={{
                              fontWeight: 600,
                              minWidth: 100,
                              fontSize:
                                appleLiquidGlass.typography.button.fontSize,
                              textTransform: "none",
                              px: 1.5,
                              py: 0.625,
                              borderRadius: appleLiquidGlass.radius.small,
                              bgcolor:
                                comparisonSelection.length >= 2
                                  ? (theme) => theme.palette.primary.main
                                  : "transparent",
                              color:
                                comparisonSelection.length >= 2
                                  ? "#ffffff"
                                  : (theme) =>
                                      getThemeValue(
                                        appleLiquidGlass.text.secondary,
                                        theme.palette.mode === "dark",
                                      ),
                              border: (theme) =>
                                `1px solid ${
                                  comparisonSelection.length >= 2
                                    ? theme.palette.primary.main
                                    : getThemeValue(
                                        appleLiquidGlass.borders.subtle,
                                        theme.palette.mode === "dark",
                                      )
                                }`,
                              "&.Mui-disabled": {
                                opacity: appleLiquidGlass.opacity.disabled,
                                borderColor: (theme) =>
                                  getThemeValue(
                                    appleLiquidGlass.borders.subtle,
                                    theme.palette.mode === "dark",
                                  ),
                              },
                              "&:hover:not(.Mui-disabled)": {
                                bgcolor:
                                  comparisonSelection.length >= 2
                                    ? (theme) => theme.palette.primary.dark
                                    : (theme) =>
                                        getThemeValue(
                                          appleLiquidGlass.backgrounds.button
                                            .hover,
                                          theme.palette.mode === "dark",
                                        ),
                                transform:
                                  appleLiquidGlass.transforms.hover.button,
                                boxShadow: (theme) =>
                                  getThemeValue(
                                    {
                                      light:
                                        appleLiquidGlass.shadows.light.medium,
                                      dark: appleLiquidGlass.shadows.dark
                                        .medium,
                                    },
                                    theme.palette.mode === "dark",
                                  ),
                              },
                              transition: appleLiquidGlass.transitions.standard,
                            }}
                          >
                            Compare ({comparisonSelection.length}/2)
                          </Button>
                          <Button
                            variant={
                              comparisonSelection.length === 1
                                ? "contained"
                                : "outlined"
                            }
                            color="secondary"
                            size="small"
                            disabled={comparisonSelection.length !== 1}
                            onClick={handleOpenThenNowModal}
                            startIcon={<History fontSize="small" />}
                            sx={{
                              fontWeight: 600,
                              minWidth: 100,
                              fontSize:
                                appleLiquidGlass.typography.button.fontSize,
                              textTransform: "none",
                              px: 1.5,
                              py: 0.625,
                              borderRadius: appleLiquidGlass.radius.small,
                              bgcolor:
                                comparisonSelection.length === 1
                                  ? (theme) => theme.palette.secondary.main
                                  : "transparent",
                              color:
                                comparisonSelection.length === 1
                                  ? "#ffffff"
                                  : (theme) =>
                                      getThemeValue(
                                        appleLiquidGlass.text.secondary,
                                        theme.palette.mode === "dark",
                                      ),
                              border: (theme) =>
                                `1px solid ${
                                  comparisonSelection.length === 1
                                    ? theme.palette.secondary.main
                                    : getThemeValue(
                                        appleLiquidGlass.borders.subtle,
                                        theme.palette.mode === "dark",
                                      )
                                }`,
                              "&.Mui-disabled": {
                                opacity: appleLiquidGlass.opacity.disabled,
                                borderColor: (theme) =>
                                  getThemeValue(
                                    appleLiquidGlass.borders.subtle,
                                    theme.palette.mode === "dark",
                                  ),
                              },
                              "&:hover:not(.Mui-disabled)": {
                                bgcolor:
                                  comparisonSelection.length === 1
                                    ? (theme) => theme.palette.secondary.dark
                                    : (theme) =>
                                        getThemeValue(
                                          appleLiquidGlass.backgrounds.button
                                            .hover,
                                          theme.palette.mode === "dark",
                                        ),
                                transform:
                                  appleLiquidGlass.transforms.hover.button,
                                boxShadow: (theme) =>
                                  getThemeValue(
                                    {
                                      light:
                                        appleLiquidGlass.shadows.light.medium,
                                      dark: appleLiquidGlass.shadows.dark
                                        .medium,
                                    },
                                    theme.palette.mode === "dark",
                                  ),
                              },
                              transition: appleLiquidGlass.transitions.standard,
                            }}
                          >
                            Then vs Now
                          </Button>
                        </Stack>
                      </Stack>
                    </Box>

                    {/* Mobile-only Unified 4-Button View Toggle */}
                    <Box
                      sx={{
                        display: { xs: "block", md: "none" },
                        mb: { xs: 1.5, md: 2 },
                      }}
                    >
                      <Paper
                        elevation={0}
                        sx={{
                          bgcolor: "transparent",
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <ToggleButtonGroup
                          value={mobileViewValue}
                          exclusive
                          onChange={handleMobileViewChange}
                          aria-label="view mode"
                          size="small"
                          sx={{
                            "& .MuiToggleButton-root": {
                              px: { xs: 1, md: 1.25 },
                              py: { xs: 0.375, md: 0.5 },
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              textTransform: "none",
                              border: (theme) =>
                                `1px solid ${theme.palette.divider}`,
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
                          <ToggleButton
                            value="timeline"
                            aria-label="timeline view"
                          >
                            <Timeline sx={{ mr: 0.5, fontSize: 16 }} />
                            Timeline
                          </ToggleButton>
                          <ToggleButton
                            value="gallery"
                            aria-label="gallery view"
                          >
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
                            } else if (
                              value === "grid" ||
                              value === "timeline" ||
                              value === "gallery"
                            ) {
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
                                theme.palette.mode === "dark"
                                  ? "#B4B4B4"
                                  : "#6B7280",
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
                                  theme.palette.mode === "dark"
                                    ? "#10B981"
                                    : "#059669",
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
                          <ToggleButton
                            value="timeline"
                            aria-label="timeline view"
                          >
                            <Timeline sx={{ mr: 0.75, fontSize: 16 }} />
                            Timeline
                          </ToggleButton>
                          <ToggleButton
                            value="gallery"
                            aria-label="gallery view"
                          >
                            <PhotoLibrary sx={{ mr: 0.75, fontSize: 16 }} />
                            Gallery
                          </ToggleButton>
                        </ToggleButtonGroup>
                      </Paper>
                    </Box>

                    {/* Results Grid (always visible on desktop, conditional on mobile) */}
                    <Box
                      sx={{
                        display: {
                          xs: viewMode === "grid" ? "block" : "none",
                          md: "block",
                        },
                      }}
                    >
                      {filteredPhotos.length > 0 && (
                        <>
                          <Box sx={{ mb: { xs: 1.5, md: 2 } }}>
                            <Typography
                              variant="caption"
                              sx={{
                                fontWeight: 600,
                                mb: { xs: 0.5, md: 0.75 },
                                display: "block",
                                fontSize: "0.7rem",
                                color: "text.secondary",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              Quick Filters
                            </Typography>
                            <Stack
                              direction="row"
                              spacing={0.5}
                              flexWrap="wrap"
                              useFlexGap
                            >
                              {FILTER_PRESETS.map((preset) => {
                                const Icon = preset.icon;
                                // Determine if this preset is "active" based on current filters
                                const isActivePreset = (() => {
                                  if (preset.id === "historical") {
                                    return (
                                      filters.endDate &&
                                      new Date(filters.endDate).getFullYear() <=
                                        1980
                                    );
                                  } else if (preset.id === "modern") {
                                    return (
                                      filters.startDate &&
                                      new Date(
                                        filters.startDate,
                                      ).getFullYear() >= 2000
                                    );
                                  } else if (preset.id === "high-detail") {
                                    return (
                                      filters.selectedScales.length > 0 &&
                                      filters.selectedScales.every(
                                        (s) => s <= 5000,
                                      )
                                    );
                                  }
                                  return false;
                                })();

                                return (
                                  <Tooltip
                                    key={preset.id}
                                    title={preset.description}
                                    arrow
                                    placement="top"
                                  >
                                    <Chip
                                      icon={<Icon sx={{ fontSize: 14 }} />}
                                      label={preset.label}
                                      onClick={() =>
                                        handleQuickFilterPreset(preset.id)
                                      }
                                      size="small"
                                      variant={
                                        isActivePreset ? "filled" : "outlined"
                                      }
                                      color={
                                        isActivePreset ? "primary" : "default"
                                      }
                                      sx={{
                                        height: 26,
                                        fontSize: "0.7rem",
                                        fontWeight: 600,
                                        cursor: "pointer",
                                        transition: "all 0.2s ease-in-out",
                                        ...(isActivePreset && {
                                          bgcolor: (theme) =>
                                            theme.palette.mode === "dark"
                                              ? "rgba(16, 185, 129, 0.3)"
                                              : "rgba(5, 150, 105, 0.2)",
                                          borderColor: (theme) =>
                                            theme.palette.mode === "dark"
                                              ? "#10B981"
                                              : "#059669",
                                          color: (theme) =>
                                            theme.palette.mode === "dark"
                                              ? "#10B981"
                                              : "#059669",
                                          fontWeight: 700,
                                          "& .MuiChip-icon": {
                                            color: (theme) =>
                                              theme.palette.mode === "dark"
                                                ? "#10B981"
                                                : "#059669",
                                          },
                                        }),
                                        "&:hover": {
                                          borderColor: "primary.main",
                                          bgcolor: (theme) =>
                                            theme.palette.mode === "dark"
                                              ? "rgba(16, 185, 129, 0.2)"
                                              : "rgba(5, 150, 105, 0.15)",
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
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          mb={{ xs: 1.5, md: 2 }}
                        >
                          {comparisonSelection.map((photo) => (
                            <Chip
                              key={`compare-chip-${getPhotoKey(photo)}`}
                              label={`${photo.dateFormatted || "Unknown"} • ${photo.IMAGE_NAME}`}
                              onDelete={() =>
                                handleRemoveComparisonPhoto(getPhotoKey(photo))
                              }
                              size="small"
                              sx={{ maxWidth: 260 }}
                            />
                          ))}
                          <Chip
                            label="Clear"
                            onClick={handleClearComparisonSelection}
                            onDelete={
                              comparisonSelection.length
                                ? handleClearComparisonSelection
                                : undefined
                            }
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      )}

                      {resultsViewMode === "gallery" ? (
                        <PhotoViewer
                          photo={filteredPhotos[0] || null}
                          photos={filteredPhotos}
                          open
                          onClose={() => setResultsViewMode("grid")} // Go back to grid when closing
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
                      py: { xs: 3, md: 5 },
                      px: { xs: 1.5, md: 2.5 },
                      width: "100%",
                      display: { xs: "none", md: "flex" }, // Hide on mobile, show on desktop
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
                          theme.palette.mode === "dark"
                            ? "2px solid rgba(0, 77, 64, 0.3)"
                            : "2px solid rgba(0, 77, 64, 0.2)",
                      }}
                    >
                      <SearchIcon
                        sx={{
                          fontSize: { xs: 50, md: 40 },
                          color: "primary.main",
                        }}
                      />
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
                      Discover decades of aerial photography from across
                      Tasmania. Search by location, filter by date and scale,
                      and explore the landscape through time.
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
                          icon: (
                            <SearchIcon sx={{ fontSize: { xs: 28, md: 24 } }} />
                          ),
                          title: "Search Any Location",
                          description:
                            "Enter coordinates or search by place name",
                        },
                        {
                          icon: (
                            <MapIcon sx={{ fontSize: { xs: 28, md: 24 } }} />
                          ),
                          title: "Explore on Map",
                          description:
                            "Click anywhere on the map to discover photos",
                        },
                        {
                          icon: (
                            <GridView sx={{ fontSize: { xs: 28, md: 24 } }} />
                          ),
                          title: "Filter & Sort",
                          description:
                            "Refine results by date, scale, and image type",
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
                            sx={{
                              fontSize: { xs: "0.9rem", md: "0.85rem" },
                              mb: 0.5,
                            }}
                          >
                            {feature.title}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              fontSize: { xs: "0.8rem", md: "0.75rem" },
                              lineHeight: 1.4,
                            }}
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
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.75,
                          justifyContent: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        {["Hobart", "Launceston", "Devonport", "Burnie"].map(
                          (city) => (
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
                                    theme.palette.mode === "dark"
                                      ? "rgba(0, 77, 64, 0.15)"
                                      : "rgba(0, 77, 64, 0.08)",
                                  transform: "scale(1.05)",
                                },
                              }}
                            />
                          ),
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Right Side - Persistent Map (desktop always, mobile when no searchParams or when map mode active) */}
            <Box
              sx={{
                width: {
                  xs: "100%",
                  md: sidebarOpen ? "calc(100% - 480px)" : "100%",
                },
                transition: "width 0.3s ease-in-out",
                display: {
                  xs: !searchParams || viewMode === "map" ? "block" : "none",
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
                    transform: searchBoxExpanded
                      ? "translateY(0)"
                      : "translateY(-100%)",
                    opacity: searchBoxExpanded ? 1 : 0,
                    pointerEvents: searchBoxExpanded ? "auto" : "none",
                  }}
                >
                  <SearchBar onSearch={handleSearch} loading={isLoading} />
                </Box>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ position: "absolute", bottom: -48, right: 8 }}
                >
                  <Tooltip
                    title={searchBoxExpanded ? "Hide search" : "Show search"}
                    placement="left"
                  >
                    <IconButton
                      onClick={() => setSearchBoxExpanded(!searchBoxExpanded)}
                      sx={{
                        bgcolor: searchBoxExpanded
                          ? "background.paper"
                          : "primary.main",
                        color: searchBoxExpanded
                          ? "text.primary"
                          : "primary.contrastText",
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
                      aria-label={
                        searchBoxExpanded ? "Hide search" : "Show search"
                      }
                    >
                      {searchBoxExpanded ? <ExpandLess /> : <SearchIcon />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>

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
                      <Typography
                        variant="h6"
                        sx={{ mt: 2, color: "text.secondary" }}
                      >
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
                  pendingPin={pendingPin}
                  onConfirmPin={handleConfirmPin}
                  onCancelPin={handleCancelPin}
                />
              </Suspense>
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
      )}

      {/* Modals - shared between both layouts */}

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
      <ChangelogModal
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
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

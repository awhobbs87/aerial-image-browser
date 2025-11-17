import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Stack,
  Button,
  Alert,
  CircularProgress,
  Paper,
  IconButton,
  useTheme,
  useMediaQuery,
  Fade,
  Chip,
  Tabs,
  Tab,
  Slider,
} from "@mui/material";
import { Map as MapIcon, Close, Info, KeyboardArrowLeft, KeyboardArrowRight } from "@mui/icons-material";
import type { EnhancedPhoto } from "../types/api";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import apiClient from "../lib/apiClient";

// Satellite imagery style using Esri World Imagery
const SATELLITE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'esri-satellite': {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      ],
      tileSize: 256,
      attribution: 'Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community'
    }
  },
  layers: [
    {
      id: 'esri-satellite-layer',
      type: 'raster',
      source: 'esri-satellite',
      minzoom: 0,
      maxzoom: 22
    }
  ]
};

interface ThenNowModalProps {
  open: boolean;
  photo: EnhancedPhoto | null;
  onClose: () => void;
}

export default function ThenNowModal({
  open,
  photo,
  onClose,
}: ThenNowModalProps) {
  const [tab, setTab] = useState<"side-by-side" | "slider">("side-by-side");
  const [sliderValue, setSliderValue] = useState(50);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [satelliteImageLoaded, setSatelliteImageLoaded] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const satelliteCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const previewUrl = useMemo(() => {
    if (!photo) return null;
    return apiClient.getOptimizedImageUrl(photo.IMAGE_NAME, photo.layerId, {
      width: 1600,
      format: "webp",
      quality: 85,
    });
  }, [photo]);

  // Reset states when photo changes or modal opens
  useEffect(() => {
    if (open) {
      setImageLoaded(false);
      setImageError(false);
      setSatelliteImageLoaded(false);
      setMapReady(false);
      setMapError(false);
      setSliderValue(50);
    }
  }, [photo, open]);

  // Keyboard shortcuts for slider
  useEffect(() => {
    if (!open || tab !== "slider" || !photo) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSliderValue((prev) => Math.max(0, prev - 5));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSliderValue((prev) => Math.min(100, prev + 5));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, tab, photo]);

  // Capture satellite view as image for slider comparison
  const captureSatelliteImage = useCallback(() => {
    if (!mapRef.current || !satelliteCanvasRef.current) {
      console.log("Cannot capture: map or canvas not ready");
      return;
    }

    try {
      const canvas = mapRef.current.getCanvas();
      const ctx = satelliteCanvasRef.current.getContext("2d");
      if (!ctx) {
        console.error("Cannot get canvas 2d context");
        return;
      }

      satelliteCanvasRef.current.width = canvas.width;
      satelliteCanvasRef.current.height = canvas.height;
      ctx.drawImage(canvas, 0, 0);
      setSatelliteImageLoaded(true);
      console.log("Satellite image captured successfully");
    } catch (error) {
      console.error("Failed to capture satellite image:", error);
    }
  }, []);

  // Initialize map - only once when modal opens
  useEffect(() => {
    if (!open || !photo) return;

    // Give the DOM time to render the container
    const timeoutId = setTimeout(() => {
      if (!mapContainerRef.current || mapRef.current) return;

      console.log("Initializing map...");

      try {
        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: SATELLITE_STYLE,
          center: [147.325, -42.879],
          zoom: 8,
          attributionControl: false,
        });

        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-right"
        );

        map.on("load", () => {
          console.log("Map loaded successfully");
          setMapReady(true);
          setMapError(false);
          // Capture satellite image after a short delay to ensure rendering
          setTimeout(() => {
            captureSatelliteImage();
          }, 1500);
        });

        map.on("idle", () => {
          // Update captured image when map stops moving
          if (tab === "slider") {
            captureSatelliteImage();
          }
        });

        map.on("error", (e) => {
          console.error("Map error:", e);
          setMapError(true);
          setMapReady(false);
        });

        mapRef.current = map;
      } catch (error) {
        console.error("Failed to initialize map:", error);
        setMapError(true);
        setMapReady(false);
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      if (mapRef.current) {
        console.log("Cleaning up map");
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
      setMapError(false);
      setSatelliteImageLoaded(false);
    };
  }, [open, photo]); // Don't include tab or captureSatelliteImage to avoid recreating map

  // Re-capture when switching to slider tab
  useEffect(() => {
    if (open && tab === "slider" && mapReady) {
      console.log("Tab switched to slider, re-capturing image...");
      setSatelliteImageLoaded(false); // Reset to show loading state
      setTimeout(() => {
        captureSatelliteImage();
      }, 300);
    }
  }, [tab, mapReady, open, captureSatelliteImage]);

  // Add photo footprint overlay
  useEffect(() => {
    if (!open || !mapReady || !mapRef.current || !photo?.geometry?.rings?.[0]) {
      return;
    }

    const map = mapRef.current;
    const coordinates = photo.geometry.rings[0];

    try {
      // Remove existing source/layer if they exist
      if (map.getLayer("photo-footprint")) {
        map.removeLayer("photo-footprint");
      }
      if (map.getSource("photo-footprint")) {
        map.removeSource("photo-footprint");
      }

      // Add photo footprint
      map.addSource("photo-footprint", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: {
            type: "Polygon",
            coordinates: [coordinates.map((coord) => [coord[0], coord[1]])],
          },
          properties: {},
        },
      });

      map.addLayer({
        id: "photo-footprint",
        type: "fill",
        source: "photo-footprint",
        paint: {
          "fill-color": "#10b981",
          "fill-opacity": 0.3,
        },
      });

      map.addLayer({
        id: "photo-footprint-outline",
        type: "line",
        source: "photo-footprint",
        paint: {
          "line-color": "#10b981",
          "line-width": 3,
        },
      });

      // Fit map to photo bounds
      const bounds = coordinates.reduce(
        (acc: maplibregl.LngLatBounds, coord: [number, number]) =>
          acc.extend(coord as [number, number]),
        new maplibregl.LngLatBounds(
          coordinates[0] as [number, number],
          coordinates[0] as [number, number]
        )
      );
      map.fitBounds(bounds, { padding: 24, maxZoom: 17 });

      // Trigger a capture after map moves to new bounds
      setTimeout(() => {
        if (tab === "slider") {
          captureSatelliteImage();
        }
      }, 1000);
    } catch (error) {
      console.error("Failed to add photo footprint:", error);
    }
  }, [open, mapReady, photo, tab, captureSatelliteImage]);

  const renderSliderView = () => {
    if (!photo || !previewUrl) return null;

    return (
      <>
        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: { xs: 400, md: 600 },
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: 4,
            bgcolor: "black",
          }}
        >
          {/* Loading overlay */}
          {(!imageLoaded || !satelliteImageLoaded) && (
            <Fade in timeout={300}>
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "rgba(0,0,0,0.7)",
                  zIndex: 10,
                  gap: 2,
                }}
              >
                <CircularProgress size={48} />
                <Typography variant="body2" color="white">
                  {!imageLoaded ? "Loading historical photo..." : "Capturing satellite view..."}
                </Typography>
              </Box>
            </Fade>
          )}

          {/* Satellite view (background - full image) */}
          <Box
            component="canvas"
            ref={satelliteCanvasRef}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 1,
              pointerEvents: "none",
              opacity: satelliteImageLoaded ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
            }}
          />

          {/* Historical photo (foreground with clip-path) */}
          <Box
            component="img"
            src={previewUrl}
            alt={photo.IMAGE_NAME}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            sx={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 2,
              pointerEvents: "none",
              backgroundColor: "transparent",
              clipPath: `polygon(${sliderValue}% 0, 100% 0, 100% 100%, ${sliderValue}% 100%)`,
              opacity: imageLoaded ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
            }}
          />

          {/* Photo labels */}
          {imageLoaded && satelliteImageLoaded && (
            <Fade in timeout={500}>
              <Box>
                <Chip
                  label="NOW (Satellite)"
                  size="small"
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    zIndex: 4,
                    bgcolor: "rgba(0,0,0,0.7)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                  }}
                />
                <Chip
                  label={`THEN (${photo.dateFormatted || "Unknown"})`}
                  size="small"
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    right: 16,
                    zIndex: 4,
                    bgcolor: "rgba(0,0,0,0.7)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                  }}
                />
              </Box>
            </Fade>
          )}

          {/* Slider handle */}
          <Box
            onPointerDown={(e) => {
              const element = e.currentTarget.parentElement;
              if (!element) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              const bounds = element.getBoundingClientRect();

              const updateSlider = (clientX: number) => {
                const relativeX =
                  ((clientX - bounds.left) / bounds.width) * 100;
                setSliderValue(Math.min(100, Math.max(0, relativeX)));
              };

              updateSlider(e.clientX);

              const moveListener = (event: PointerEvent) =>
                updateSlider(event.clientX);
              const upListener = (event: PointerEvent) => {
                e.currentTarget.releasePointerCapture(event.pointerId);
                window.removeEventListener("pointermove", moveListener);
                window.removeEventListener("pointerup", upListener);
                window.removeEventListener("pointercancel", upListener);
              };

              window.addEventListener("pointermove", moveListener);
              window.addEventListener("pointerup", upListener);
              window.addEventListener("pointercancel", upListener);
            }}
            sx={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `calc(${sliderValue}% - 2px)`,
              width: 4,
              bgcolor: "primary.main",
              boxShadow: "0 0 16px rgba(16, 185, 129, 0.8)",
              cursor: "ew-resize",
              touchAction: "none",
              zIndex: 3,
              transition: "box-shadow 0.2s ease-in-out",
              "&:hover": {
                boxShadow: "0 0 24px rgba(16, 185, 129, 1)",
              },
              "&::before": {
                content: '""',
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 40,
                height: 40,
                borderRadius: "50%",
                border: "3px solid currentColor",
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(0,0,0,0.6)"
                    : "rgba(255,255,255,0.8)",
              },
              "&::after": {
                content: '""',
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 24,
                height: 2,
                bgcolor: "currentColor",
              },
            }}
          >
            <KeyboardArrowLeft
              sx={{
                position: "absolute",
                top: "50%",
                left: -28,
                transform: "translateY(-50%)",
                fontSize: 20,
                color: "primary.main",
              }}
            />
            <KeyboardArrowRight
              sx={{
                position: "absolute",
                top: "50%",
                right: -28,
                transform: "translateY(-50%)",
                fontSize: 20,
                color: "primary.main",
              }}
            />
          </Box>
        </Box>
        <Box sx={{ mt: 3, mx: { xs: 2, md: 10 } }}>
          <Slider
            value={sliderValue}
            onChange={(_e, value) => setSliderValue(value as number)}
            min={0}
            max={100}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}%`}
            sx={{
              "& .MuiSlider-thumb": {
                width: 20,
                height: 20,
              },
            }}
          />
          <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              THEN ({photo.dateFormatted || "Unknown"})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              NOW (Satellite)
            </Typography>
          </Stack>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontStyle: "italic", display: "block", textAlign: "center", mt: 2 }}
        >
          Use arrow keys (←/→) to adjust slider
        </Typography>
      </>
    );
  };

  const renderContent = () => {
    if (!photo) {
      return (
        <Alert severity="info" icon={<Info />}>
          Select a photo to enable Then vs Now comparison.
        </Alert>
      );
    }

    if (!photo.geometry?.rings?.[0]) {
      return (
        <Alert severity="warning">
          This photo is missing geometry information and cannot be mapped.
        </Alert>
      );
    }

    if (tab === "slider") {
      return renderSliderView();
    }

    return (
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        {/* Historical Photo */}
        <Paper sx={{ flex: 1, p: 2, borderRadius: 3 }} elevation={3}>
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip
                label="THEN"
                size="small"
                color="primary"
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="subtitle1" fontWeight={700}>
                {photo.dateFormatted || "Unknown Date"}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {photo.IMAGE_NAME}
            </Typography>
            <Box sx={{ position: "relative" }}>
              {!imageLoaded && !imageError && (
                <Fade in timeout={300}>
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "rgba(0,0,0,0.05)",
                      borderRadius: 2,
                      minHeight: 300,
                    }}
                  >
                    <CircularProgress />
                  </Box>
                </Fade>
              )}
              {imageError && (
                <Alert severity="error" sx={{ minHeight: 300 }}>
                  Failed to load historical image
                </Alert>
              )}
              <Box
                component="img"
                src={previewUrl || undefined}
                alt={photo.IMAGE_NAME}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                sx={{
                  width: "100%",
                  borderRadius: 2,
                  objectFit: "contain",
                  maxHeight: 400,
                  opacity: imageLoaded ? 1 : 0,
                  transition: "opacity 0.3s ease-in-out",
                  bgcolor: "black",
                }}
              />
            </Box>
            {photo.SCALE && (
              <Typography variant="caption" color="text.secondary">
                Scale: 1:{photo.SCALE.toLocaleString()}
              </Typography>
            )}
          </Stack>
        </Paper>

        {/* Current Map View */}
        <Paper sx={{ flex: 1, p: 2, borderRadius: 3 }} elevation={3}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip
                label="NOW"
                size="small"
                color="secondary"
                sx={{ fontWeight: 700 }}
              />
              <MapIcon color="action" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>
                Current Satellite View
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Live map showing the same area today
            </Typography>
            {/* Map container - always rendered here for side-by-side view */}
            <Box
              sx={{
                width: "100%",
                height: { xs: 320, md: 400 },
                borderRadius: 2,
                overflow: "hidden",
                position: "relative",
                bgcolor: "grey.100",
              }}
            >
              {/* Actual map container DIV */}
              <Box
                ref={mapContainerRef}
                sx={{
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  inset: 0,
                }}
              />
              {!mapReady && !mapError && (
                <Fade in timeout={300}>
                  <Box
                    sx={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "rgba(0,0,0,0.05)",
                      zIndex: 1,
                      gap: 1,
                    }}
                  >
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary">
                      Loading map...
                    </Typography>
                  </Box>
                </Fade>
              )}
              {mapError && (
                <Alert severity="error" sx={{ m: 2 }}>
                  Failed to load map. Please try again.
                </Alert>
              )}
            </Box>
            {!mapError && (
              <Stack spacing={1}>
                <Alert severity="info" icon={<Info />}>
                  The green highlighted area shows the footprint of the historical
                  photo
                </Alert>
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  Satellite imagery (2020-2024) from Esri World Imagery
                </Typography>
              </Stack>
            )}
          </Stack>
        </Paper>
      </Stack>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: { borderRadius: { xs: 0, sm: 3 }, minHeight: "80vh" },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 1 }}>
        <Stack spacing={0.5}>
          <Typography variant="h5" fontWeight={700}>
            Then vs Now
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compare historical aerial photography with current satellite imagery
          </Typography>
        </Stack>
        <IconButton onClick={onClose} aria-label="Close Then vs Now modal">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        {photo && (
          <Tabs
            value={tab}
            onChange={(_e, value) => setTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ mb: 2 }}
          >
            <Tab label="Side-by-Side" value="side-by-side" />
            <Tab label="Slider Comparison" value="slider" />
          </Tabs>
        )}
        {renderContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {photo && (
          <Button
            variant="contained"
            href={photo.DOWNLOAD_LINK || undefined}
            target="_blank"
            rel="noopener noreferrer"
            disabled={!photo.DOWNLOAD_LINK}
          >
            Download Original TIFF
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

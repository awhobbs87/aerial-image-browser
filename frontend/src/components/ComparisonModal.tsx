import { useMemo, useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Box,
  Typography,
  Stack,
  Chip,
  Button,
  IconButton,
  Slider,
  Alert,
  Tooltip,
  Paper,
} from "@mui/material";
import { Close, Map as MapIcon, DeleteOutline, CompareArrows } from "@mui/icons-material";
import { MapContainer, TileLayer, Polygon } from "react-leaflet";
import { LatLngBounds } from "leaflet";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";
import "../lib/leafletConfig";

type ComparisonTab = "slider" | "side-by-side" | "then-now";

interface ComparisonModalProps {
  open: boolean;
  photos: EnhancedPhoto[];
  onClose: () => void;
  onRemovePhoto: (photoKey: string) => void;
  onClear: () => void;
}

const TILE_LAYER_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TILE_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

function getPhotoKey(photo: EnhancedPhoto) {
  return `${photo.layerId}-${photo.OBJECTID}`;
}

function getPreviewUrl(photo: EnhancedPhoto) {
  return apiClient.getOptimizedImageUrl(photo.IMAGE_NAME, photo.layerId, {
    width: 1600,
    format: "webp",
    quality: 85,
  });
}

function ComparisonMap({ photo }: { photo: EnhancedPhoto }) {
  const polygon = useMemo(() => {
    if (!photo.geometry?.rings?.[0]) return null;
    return photo.geometry.rings[0].map(([lon, lat]: [number, number]) => [lat, lon]) as [number, number][];
  }, [photo.geometry]);

  const bounds = useMemo(() => {
    if (!polygon) return null;
    return new LatLngBounds(polygon);
  }, [polygon]);

  const center = polygon?.[0] || [-42.0, 147.0];

  return (
    <MapContainer
      center={center as [number, number]}
      bounds={bounds ?? undefined}
      scrollWheelZoom={false}
      style={{ width: "100%", height: 360, borderRadius: 16, overflow: "hidden" }}
    >
      <TileLayer attribution={TILE_ATTRIBUTION} url={TILE_LAYER_URL} />
      {polygon && (
        <Polygon
          positions={polygon}
          pathOptions={{
            color: "#10b981",
            fillColor: "rgba(16, 185, 129, 0.2)",
            weight: 2,
          }}
        />
      )}
    </MapContainer>
  );
}

export default function ComparisonModal({ open, photos, onClose, onRemovePhoto, onClear }: ComparisonModalProps) {
  const [tab, setTab] = useState<ComparisonTab>("slider");
  const [sliderValue, setSliderValue] = useState(50);

  useEffect(() => {
    if (photos.length < 2 && (tab === "slider" || tab === "side-by-side")) {
      setTab("then-now");
    }
  }, [photos.length, tab]);

  const [primaryPhoto, secondaryPhoto] = photos;
  const primaryUrl = primaryPhoto ? getPreviewUrl(primaryPhoto) : null;
  const secondaryUrl = secondaryPhoto ? getPreviewUrl(secondaryPhoto) : null;
  const hasTwoPhotos = photos.length >= 2;

  const handleClose = () => {
    setTab("slider");
    setSliderValue(50);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="lg">
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pr: 1,
        }}
      >
        <Stack spacing={0.5}>
          <Typography variant="h6" fontWeight={700}>
            Photo Comparison
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Toggle between slider, side-by-side, or Then vs Now views.
          </Typography>
        </Stack>
        <IconButton onClick={handleClose} aria-label="Close comparison modal">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            {photos.map((photo) => (
              <Chip
                key={getPhotoKey(photo)}
                label={`${photo.dateFormatted || "Unknown"} • ${photo.IMAGE_NAME}`}
                onDelete={() => onRemovePhoto(getPhotoKey(photo))}
                deleteIcon={<DeleteOutline />}
                sx={{ maxWidth: 300 }}
              />
            ))}
            {photos.length > 0 && (
              <Button size="small" color="inherit" onClick={onClear}>
                Clear
              </Button>
            )}
          </Stack>
          <Tabs
            value={tab}
            onChange={(_e, value) => setTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab label="Slider" value="slider" disabled={!hasTwoPhotos} />
            <Tab label="Side-by-Side" value="side-by-side" disabled={!hasTwoPhotos} />
            <Tab label="Then vs Now" value="then-now" />
          </Tabs>
        </Stack>

        {tab === "slider" && (
          <>
            {!hasTwoPhotos ? (
              <Alert severity="info">Select two photos to enable the slider comparison.</Alert>
            ) : (
              <>
                <Box
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: { xs: 260, md: 420 },
                    borderRadius: 3,
                    overflow: "hidden",
                    boxShadow: 3,
                    bgcolor: "black",
                  }}
                >
                  {primaryUrl && (
                    <Box
                      component="img"
                      src={primaryUrl}
                      alt={primaryPhoto?.IMAGE_NAME}
                      sx={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  )}

                  {secondaryUrl && (
                    <>
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          bottom: 0,
                          width: `${sliderValue}%`,
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          component="img"
                          src={secondaryUrl}
                          alt={secondaryPhoto?.IMAGE_NAME}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </Box>
                      <Box
                        sx={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          left: `calc(${sliderValue}% - 2px)`,
                          width: 4,
                          bgcolor: "primary.main",
                          boxShadow: "0 0 12px rgba(16, 185, 129, 0.7)",
                        }}
                      />
                    </>
                  )}
                </Box>
                <Slider
                  value={sliderValue}
                  onChange={(_e, value) => setSliderValue(value as number)}
                  sx={{ mt: 3 }}
                  min={0}
                  max={100}
                  valueLabelDisplay="auto"
                />
              </>
            )}
          </>
        )}

        {tab === "side-by-side" && (
          <>
            {!hasTwoPhotos ? (
              <Alert severity="info">Select two photos to enable side-by-side comparison.</Alert>
            ) : (
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                {[primaryPhoto, secondaryPhoto].map((photo, index) => (
                  <Paper
                    key={photo ? getPhotoKey(photo) : `placeholder-${index}`}
                    sx={{ flex: 1, p: 2, borderRadius: 3 }}
                    variant="outlined"
                  >
                    {photo ? (
                      <Stack spacing={1}>
                        <Typography variant="subtitle1" fontWeight={700}>
                          {photo.dateFormatted || "Unknown Date"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {photo.IMAGE_NAME}
                        </Typography>
                        <Box
                          component="img"
                          src={getPreviewUrl(photo)}
                          alt={photo.IMAGE_NAME}
                          sx={{
                            width: "100%",
                            borderRadius: 2,
                            objectFit: "contain",
                            maxHeight: 360,
                          }}
                        />
                      </Stack>
                    ) : (
                      <Alert severity="info">Select {index + 1} photo(s) to compare.</Alert>
                    )}
                  </Paper>
                ))}
              </Stack>
            )}
          </>
        )}

        {tab === "then-now" && (
          <>
            {!primaryPhoto ? (
              <Alert severity="info">Select at least one historical photo to enable this mode.</Alert>
            ) : !primaryPhoto.geometry ? (
              <Alert severity="warning">
                This photo is missing geometry, so we cannot locate it on the modern map.
              </Alert>
            ) : (
              <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                <Paper sx={{ flex: 1, p: 2, borderRadius: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Then — {primaryPhoto.dateFormatted || "Unknown Date"}
                  </Typography>
                  <Box
                    component="img"
                    src={primaryUrl || undefined}
                    alt={primaryPhoto.IMAGE_NAME}
                    sx={{
                      width: "100%",
                      borderRadius: 2,
                      objectFit: "contain",
                      maxHeight: 360,
                    }}
                  />
                </Paper>
                <Paper sx={{ flex: 1, p: 2, borderRadius: 3 }}>
                  <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <MapIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Now — Current Satellite
                    </Typography>
                  </Stack>
                  <ComparisonMap photo={primaryPhoto} />
                </Paper>
              </Stack>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Close
        </Button>
        <Tooltip title="Send current selection to clipboard">
          <span>
            <Button
              variant="contained"
              startIcon={<CompareArrows />}
              disabled={photos.length === 0}
              onClick={() => {
                const payload = photos
                  .map((photo) => `${photo.dateFormatted || "Unknown"} — ${photo.IMAGE_NAME}`)
                  .join("\n");
                navigator.clipboard.writeText(payload).catch(() => {
                  // ignore errors
                });
              }}
            >
              Copy selection
            </Button>
          </span>
        </Tooltip>
      </DialogActions>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
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
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Close, DeleteOutline, CompareArrows } from "@mui/icons-material";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";
import "../lib/leafletConfig";

type ComparisonTab = "slider" | "side-by-side";

interface ComparisonModalProps {
  open: boolean;
  photos: EnhancedPhoto[];
  onClose: () => void;
  onRemovePhoto: (photoKey: string) => void;
  onClear: () => void;
}

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

export default function ComparisonModal({ open, photos, onClose, onRemovePhoto, onClear }: ComparisonModalProps) {
  const [tab, setTab] = useState<ComparisonTab>("slider");
  const [sliderValue, setSliderValue] = useState(50);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xl" fullScreen={isMobile}>
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
                    height: { xs: 320, md: 520 },
                    borderRadius: 3,
                    overflow: "hidden",
                    boxShadow: 4,
                    bgcolor: "black",
                  }}
                >
                  {primaryUrl && (
                    <Box
                      component="img"
                      src={primaryUrl}
                      alt={primaryPhoto?.IMAGE_NAME}
                      sx={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        zIndex: 1,
                        pointerEvents: "none",
                        backgroundColor: "black",
                      }}
                    />
                  )}

                  {secondaryUrl && (
                    <>
                      <Box
                        component="img"
                        src={secondaryUrl}
                        alt={secondaryPhoto?.IMAGE_NAME}
                        sx={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          zIndex: 2,
                          pointerEvents: "none",
                          clipPath: `polygon(0 0, ${sliderValue}% 0, ${sliderValue}% 100%, 0% 100%)`,
                        }}
                      />
                      <Box
                        onPointerDown={(e) => {
                          const element = e.currentTarget;
                          element.setPointerCapture(e.pointerId);
                          const bounds = element.getBoundingClientRect();

                          const updateSlider = (clientX: number) => {
                            const relativeX = ((clientX - bounds.left) / bounds.width) * 100;
                            setSliderValue(Math.min(100, Math.max(0, relativeX)));
                          };

                          updateSlider(e.clientX);

                          const moveListener = (event: PointerEvent) => updateSlider(event.clientX);
                          const upListener = (event: PointerEvent) => {
                            element.releasePointerCapture(event.pointerId);
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
                          boxShadow: "0 0 12px rgba(16, 185, 129, 0.7)",
                          cursor: "ew-resize",
                          touchAction: "none",
                          zIndex: 3,
                          '&::before': {
                            content: '""',
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            border: "2px solid currentColor",
                            backgroundColor: (theme) =>
                              theme.palette.mode === "dark" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.6)",
                          },
                        }}
                      />
                    </>
                  )}
                </Box>
                <Slider
                  value={sliderValue}
                  onChange={(_e, value) => setSliderValue(value as number)}
                  sx={{ mt: 3, mx: { xs: 2, md: 10 } }}
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

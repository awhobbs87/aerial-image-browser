import { useState, useEffect, useCallback } from "react";
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
  CircularProgress,
  Fade,
} from "@mui/material";
import {
  Close,
  DeleteOutline,
  CompareArrows,
  SwapHoriz,
  KeyboardArrowLeft,
  KeyboardArrowRight,
} from "@mui/icons-material";
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
  onSwap: () => void;
}

interface ImageLoadState {
  primary: boolean;
  secondary: boolean;
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

export default function ComparisonModal({
  open,
  photos,
  onClose,
  onRemovePhoto,
  onClear,
  onSwap,
}: ComparisonModalProps) {
  const [tab, setTab] = useState<ComparisonTab>("slider");
  const [sliderValue, setSliderValue] = useState(50);
  const [imageLoaded, setImageLoaded] = useState<ImageLoadState>({
    primary: false,
    secondary: false,
  });
  const [imageError, setImageError] = useState<ImageLoadState>({
    primary: false,
    secondary: false,
  });
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Reset image load states when photos change
  useEffect(() => {
    setImageLoaded({ primary: false, secondary: false });
    setImageError({ primary: false, secondary: false });
  }, [photos]);

  useEffect(() => {
    if (photos.length < 2 && (tab === "slider" || tab === "side-by-side")) {
      setTab("slider");
    }
  }, [photos.length, tab]);

  const [primaryPhoto, secondaryPhoto] = photos;
  const primaryUrl = primaryPhoto ? getPreviewUrl(primaryPhoto) : null;
  const secondaryUrl = secondaryPhoto ? getPreviewUrl(secondaryPhoto) : null;
  const hasTwoPhotos = photos.length >= 2;

  const handleClose = useCallback(() => {
    setTab("slider");
    setSliderValue(50);
    setImageLoaded({ primary: false, secondary: false });
    setImageError({ primary: false, secondary: false });
    onClose();
  }, [onClose]);

  const handleSwapPhotos = useCallback(() => {
    if (photos.length >= 2) {
      // Reset image load states to show loading indicators during swap
      setImageLoaded({ primary: false, secondary: false });
      setImageError({ primary: false, secondary: false });
      onSwap();
    }
  }, [photos.length, onSwap]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open || !hasTwoPhotos) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Arrow keys to adjust slider (only in slider mode)
      if (tab === "slider") {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setSliderValue((prev) => Math.max(0, prev - 5));
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          setSliderValue((prev) => Math.min(100, prev + 5));
        }
      }

      // Tab key to switch between views
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        setTab((prev) => (prev === "slider" ? "side-by-side" : "slider"));
      }

      // Escape to close
      if (e.key === "Escape") {
        handleClose();
      }

      // 'S' key to swap photos
      if (e.key === "s" || e.key === "S") {
        e.preventDefault();
        handleSwapPhotos();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, tab, hasTwoPhotos, handleSwapPhotos, handleClose]);

  const allImagesLoaded = imageLoaded.primary && imageLoaded.secondary;
  const anyImageError = imageError.primary || imageError.secondary;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xl"
      fullScreen={isMobile}
    >
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
            Use arrow keys to adjust slider, Tab to switch views, S to swap
          </Typography>
        </Stack>
        <IconButton onClick={handleClose} aria-label="Close comparison modal">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2 }}>
        <Stack spacing={2} sx={{ mb: 2 }}>
          <Stack
            direction="row"
            spacing={1}
            flexWrap="wrap"
            alignItems="center"
          >
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
            {hasTwoPhotos && (
              <Tooltip title="Swap photos (keyboard: S)">
                <IconButton
                  size="small"
                  onClick={handleSwapPhotos}
                  aria-label="Swap photos"
                  color="primary"
                >
                  <SwapHoriz />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Tabs
            value={tab}
            onChange={(_e, value) => setTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
          >
            <Tab label="Slider" value="slider" disabled={!hasTwoPhotos} />
            <Tab
              label="Side-by-Side"
              value="side-by-side"
              disabled={!hasTwoPhotos}
            />
          </Tabs>
        </Stack>

        {tab === "slider" && (
          <>
            {!hasTwoPhotos ? (
              <Alert severity="info">
                Select two photos to enable the slider comparison.
              </Alert>
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
                  {/* Loading overlay */}
                  {!allImagesLoaded && !anyImageError && (
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
                          Loading images...
                        </Typography>
                      </Box>
                    </Fade>
                  )}

                  {/* Error overlay */}
                  {anyImageError && (
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(0,0,0,0.8)",
                        zIndex: 10,
                      }}
                    >
                      <Alert severity="error">
                        Failed to load one or more images. Please try again.
                      </Alert>
                    </Box>
                  )}

                  {primaryUrl && (
                    <Box
                      component="img"
                      src={primaryUrl}
                      alt={primaryPhoto?.IMAGE_NAME}
                      onLoad={() =>
                        setImageLoaded((prev) => ({ ...prev, primary: true }))
                      }
                      onError={() =>
                        setImageError((prev) => ({ ...prev, primary: true }))
                      }
                      sx={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        zIndex: 1,
                        pointerEvents: "none",
                        backgroundColor: "black",
                        opacity: imageLoaded.primary ? 1 : 0,
                        transition: "opacity 0.3s ease-in-out",
                      }}
                    />
                  )}

                  {secondaryUrl && (
                    <>
                      <Box
                        component="img"
                        src={secondaryUrl}
                        alt={secondaryPhoto?.IMAGE_NAME}
                        onLoad={() =>
                          setImageLoaded((prev) => ({
                            ...prev,
                            secondary: true,
                          }))
                        }
                        onError={() =>
                          setImageError((prev) => ({
                            ...prev,
                            secondary: true,
                          }))
                        }
                        sx={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          zIndex: 2,
                          pointerEvents: "none",
                          clipPath: `polygon(0 0, ${sliderValue}% 0, ${sliderValue}% 100%, 0% 100%)`,
                          opacity: imageLoaded.secondary ? 1 : 0,
                          transition: "opacity 0.3s ease-in-out",
                        }}
                      />

                      {/* Photo labels */}
                      <Fade in={allImagesLoaded} timeout={500}>
                        <Box>
                          <Chip
                            label={primaryPhoto?.dateFormatted || "Unknown"}
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
                          <Chip
                            label={secondaryPhoto?.dateFormatted || "Unknown"}
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
                        </Box>
                      </Fade>

                      {/* Slider handle with improved interaction */}
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
                            e.currentTarget.releasePointerCapture(
                              event.pointerId
                            );
                            window.removeEventListener(
                              "pointermove",
                              moveListener
                            );
                            window.removeEventListener("pointerup", upListener);
                            window.removeEventListener(
                              "pointercancel",
                              upListener
                            );
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
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
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
                        {/* Arrow indicators */}
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
                    </>
                  )}
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
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    sx={{ mt: 1 }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {secondaryPhoto?.dateFormatted || "Unknown"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {primaryPhoto?.dateFormatted || "Unknown"}
                    </Typography>
                  </Stack>
                </Box>
              </>
            )}
          </>
        )}

        {tab === "side-by-side" && (
          <>
            {!hasTwoPhotos ? (
              <Alert severity="info">
                Select two photos to enable side-by-side comparison.
              </Alert>
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
                        <Box sx={{ position: "relative" }}>
                          {(!imageLoaded[
                            index === 0 ? "primary" : "secondary"
                          ] &&
                            !imageError[
                              index === 0 ? "primary" : "secondary"
                            ]) && (
                            <Box
                              sx={{
                                position: "absolute",
                                inset: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                bgcolor: "rgba(0,0,0,0.1)",
                                borderRadius: 2,
                              }}
                            >
                              <CircularProgress size={40} />
                            </Box>
                          )}
                          <Box
                            component="img"
                            src={getPreviewUrl(photo)}
                            alt={photo.IMAGE_NAME}
                            onLoad={() =>
                              setImageLoaded((prev) => ({
                                ...prev,
                                [index === 0 ? "primary" : "secondary"]: true,
                              }))
                            }
                            onError={() =>
                              setImageError((prev) => ({
                                ...prev,
                                [index === 0 ? "primary" : "secondary"]: true,
                              }))
                            }
                            sx={{
                              width: "100%",
                              borderRadius: 2,
                              objectFit: "contain",
                              maxHeight: 400,
                              opacity:
                                imageLoaded[
                                  index === 0 ? "primary" : "secondary"
                                ]
                                  ? 1
                                  : 0,
                              transition: "opacity 0.3s ease-in-out",
                            }}
                          />
                          {imageError[
                            index === 0 ? "primary" : "secondary"
                          ] && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                              Failed to load image
                            </Alert>
                          )}
                        </Box>
                      </Stack>
                    ) : (
                      <Alert severity="info">
                        Select {index + 1} photo(s) to compare.
                      </Alert>
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
        <Tooltip title="Copy photo details to clipboard">
          <span>
            <Button
              variant="contained"
              startIcon={<CompareArrows />}
              disabled={photos.length === 0}
              onClick={() => {
                const payload = photos
                  .map(
                    (photo) =>
                      `${photo.dateFormatted || "Unknown"} — ${photo.IMAGE_NAME}`
                  )
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

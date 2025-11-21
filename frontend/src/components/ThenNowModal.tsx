import { useEffect, useMemo, useRef, useState } from "react";
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
  Tooltip,
  ButtonGroup,
  Divider,
  Drawer,
  Portal,
} from "@mui/material";
import { 
  Map as MapIcon, 
  Close, 
  Info, 
  KeyboardArrowLeft, 
  KeyboardArrowRight, 
  InfoOutlined,
  Tune,
  RestartAlt,
  ZoomIn,
  ZoomOut,
  RotateLeft,
  RotateRight,
  ArrowUpward,
  ArrowDownward,
  ArrowBack,
  ArrowForward,
  Image,
  Satellite,
} from "@mui/icons-material";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";

// Satellite imagery services - trying multiple sources for reliability
const IMAGERY_SERVICES = [
  {
    name: "Esri World Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export",
    requiresAuth: false,
  },
];

async function maskNowImageBlob(
  blob: Blob,
  coordinates: [number, number][],
  width: number,
  height: number,
  minX: number,
  minY: number,
  lonDelta: number,
  latDelta: number
): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create canvas context");
  }

  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  coordinates.forEach(([lon, lat], index) => {
    const x = ((lon - minX) / lonDelta) * width;
    const y = height - ((lat - minY) / latDelta) * height;
    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(bitmap, 0, 0, width, height);
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((maskedBlob) => {
      if (maskedBlob) {
        resolve(maskedBlob);
      } else {
        reject(new Error("Failed to generate masked LIST imagery blob"));
      }
    }, "image/png");
  });
}

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [nowImageUrl, setNowImageUrl] = useState<string | null>(null);
  const [nowImageLoaded, setNowImageLoaded] = useState(false);
  const [nowImageError, setNowImageError] = useState(false);
  const nowImageUrlRef = useRef<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isLandscape = useMediaQuery("(orientation: landscape) and (max-width: 960px)");

  // Target image selection for fine-tuning
  const [targetImage, setTargetImage] = useState<"then" | "now">("then");

  // Transform states for THEN image
  const [thenOffsetX, setThenOffsetX] = useState(0);
  const [thenOffsetY, setThenOffsetY] = useState(0);
  const [thenScale, setThenScale] = useState(1);
  const [thenRotation, setThenRotation] = useState(0);
  const [thenOpacity, setThenOpacity] = useState(1);
  const [thenCropTop, setThenCropTop] = useState(0);
  const [thenCropBottom, setThenCropBottom] = useState(0);
  const [thenCropLeft, setThenCropLeft] = useState(0);
  const [thenCropRight, setThenCropRight] = useState(0);

  // Transform states for NOW image
  const [nowOffsetX, setNowOffsetX] = useState(0);
  const [nowOffsetY, setNowOffsetY] = useState(0);
  const [nowScale, setNowScale] = useState(1);
  const [nowRotation, setNowRotation] = useState(0);
  const [nowOpacity, setNowOpacity] = useState(1);
  const [nowCropTop, setNowCropTop] = useState(0);
  const [nowCropBottom, setNowCropBottom] = useState(0);
  const [nowCropLeft, setNowCropLeft] = useState(0);
  const [nowCropRight, setNowCropRight] = useState(0);
  
  // Loading progress tracking
  const [loadingProgress, setLoadingProgress] = useState<string>("Initializing...");
  
  // Drawer state for fine-tune controls
  const [controlsDrawerOpen, setControlsDrawerOpen] = useState(false);

  const previewUrl = useMemo(() => {
    if (!photo) return null;
    return apiClient.getOptimizedImageUrl(photo.IMAGE_NAME, photo.layerId, {
      width: 1600,
      format: "webp",
      quality: 85,
    });
  }, [photo]);

useEffect(() => {
  return () => {
    if (nowImageUrlRef.current) {
      URL.revokeObjectURL(nowImageUrlRef.current);
      nowImageUrlRef.current = null;
    }
  };
}, []);

  useEffect(() => {
    if (!open || !photo?.geometry?.rings?.[0]) {
      if (nowImageUrlRef.current) {
        URL.revokeObjectURL(nowImageUrlRef.current);
        nowImageUrlRef.current = null;
      }
      setNowImageUrl(null);
      setNowImageLoaded(false);
      setNowImageError(false);
      return;
    }

    const controller = new AbortController();

    const fetchNowImage = async () => {
      try {
        setNowImageLoaded(false);
        setNowImageError(false);
        setLoadingProgress("Calculating photo boundaries...");

        const coordinates = photo.geometry.rings[0] as [number, number][];
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;

        coordinates.forEach(([lon, lat]: [number, number]) => {
          if (lon < minX) minX = lon;
          if (lon > maxX) maxX = lon;
          if (lat < minY) minY = lat;
          if (lat > maxY) maxY = lat;
        });

        const lonDelta = Math.max(0.0001, maxX - minX);
        const latDelta = Math.max(0.0001, maxY - minY);
        const maxSize = 2048;
        const minSize = 512;
        const width = maxSize;
        let height = Math.round((latDelta / lonDelta) * width);
        if (!Number.isFinite(height) || height <= 0) {
          height = maxSize;
        }
        height = Math.max(minSize, Math.min(maxSize, height));
        
        setLoadingProgress(`Preparing request for ${width}x${height}px imagery...`);

        const params = new URLSearchParams({
          f: "image",
          format: "png32",
          bbox: `${minX},${minY},${maxX},${maxY}`,
          bboxSR: "4326",
          imageSR: "4326",
          size: `${width},${height}`,
          dpi: "96",
          transparent: "false",
        });

        let lastError: unknown = null;
        for (let i = 0; i < IMAGERY_SERVICES.length; i++) {
          const service = IMAGERY_SERVICES[i];
          if (controller.signal.aborted) {
            return;
          }
          const exportUrl = service.url;
          setLoadingProgress(`Connecting to ${service.name}... (${i + 1}/${IMAGERY_SERVICES.length})`);
          console.log(`[ThenNowModal] Attempting to fetch from: ${exportUrl}`);
          console.log(`[ThenNowModal] Params:`, params.toString());
          
          try {
            const response = await fetch(`${exportUrl}?${params.toString()}`, {
              signal: controller.signal,
            });

            console.log(`[ThenNowModal] Response status for ${service.name}:`, response.status);

            if (!response.ok) {
              const errorText = await response.text().catch(() => 'No error details');
              console.error(`[ThenNowModal] Error response from ${service.name}:`, errorText);
              throw new Error(`Imagery request failed (${service.name}) with status ${response.status}`);
            }

            setLoadingProgress(`Downloading satellite imagery from ${service.name}...`);
            const baseBlob = await response.blob();
            console.log(`[ThenNowModal] Received blob size:`, baseBlob.size, 'type:', baseBlob.type);
            
            // Check if we actually got an image
            if (baseBlob.size === 0 || !baseBlob.type.startsWith('image/')) {
              throw new Error(`Invalid response from ${service.name}: not an image`);
            }

            setLoadingProgress("Processing and masking imagery to match photo footprint...");
            const maskedBlob = await maskNowImageBlob(
              baseBlob,
              coordinates,
              width,
              height,
              minX,
              minY,
              lonDelta,
              latDelta
            );

            console.log(`[ThenNowModal] Masked blob created, size:`, maskedBlob.size);
            setLoadingProgress("Finalizing imagery...");

            if (nowImageUrlRef.current) {
              URL.revokeObjectURL(nowImageUrlRef.current);
            }
            const objectUrl = URL.createObjectURL(maskedBlob);
            nowImageUrlRef.current = objectUrl;
            setNowImageUrl(objectUrl);
            setNowImageError(false);
            console.log(`[ThenNowModal] Successfully loaded image from ${service.name}`);
            return;
          } catch (err) {
            console.error(`[ThenNowModal] Failed to fetch from ${service.name}:`, err);
            lastError = err;
            continue;
          }
        }

        throw lastError ?? new Error("Satellite imagery request failed");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("[ThenNowModal] Failed to fetch LIST aerial imagery:", error);
        if (nowImageUrlRef.current) {
          URL.revokeObjectURL(nowImageUrlRef.current);
          nowImageUrlRef.current = null;
        }
        setNowImageUrl(null);
        setNowImageLoaded(false);
        setNowImageError(true);
      }
    };

    fetchNowImage();

    return () => {
      controller.abort();
    };
  }, [open, photo]);

  // Reset states when photo changes or modal opens
  useEffect(() => {
    if (open) {
      setImageLoaded(false);
      setImageError(false);
      setNowImageLoaded(false);
      setNowImageError(false);
      setSliderValue(50);
      setTargetImage("then");
      // Reset THEN transforms
      setThenOffsetX(0);
      setThenOffsetY(0);
      setThenScale(1);
      setThenRotation(0);
      setThenOpacity(1);
      setThenCropTop(0);
      setThenCropBottom(0);
      setThenCropLeft(0);
      setThenCropRight(0);
      // Reset NOW transforms
      setNowOffsetX(0);
      setNowOffsetY(0);
      setNowScale(1);
      setNowRotation(0);
      setNowOpacity(1);
      setNowCropTop(0);
      setNowCropBottom(0);
      setNowCropLeft(0);
      setNowCropRight(0);
      setLoadingProgress("Initializing...");
    }
  }, [photo, open]);

  // Get current transform values based on target image
  const getCurrentTransforms = () => {
    if (targetImage === "then") {
      return {
        offsetX: thenOffsetX,
        offsetY: thenOffsetY,
        scale: thenScale,
        rotation: thenRotation,
        opacity: thenOpacity,
        cropTop: thenCropTop,
        cropBottom: thenCropBottom,
        cropLeft: thenCropLeft,
        cropRight: thenCropRight,
        setOffsetX: setThenOffsetX,
        setOffsetY: setThenOffsetY,
        setScale: setThenScale,
        setRotation: setThenRotation,
        setOpacity: setThenOpacity,
        setCropTop: setThenCropTop,
        setCropBottom: setThenCropBottom,
        setCropLeft: setThenCropLeft,
        setCropRight: setThenCropRight,
      };
    } else {
      return {
        offsetX: nowOffsetX,
        offsetY: nowOffsetY,
        scale: nowScale,
        rotation: nowRotation,
        opacity: nowOpacity,
        cropTop: nowCropTop,
        cropBottom: nowCropBottom,
        cropLeft: nowCropLeft,
        cropRight: nowCropRight,
        setOffsetX: setNowOffsetX,
        setOffsetY: setNowOffsetY,
        setScale: setNowScale,
        setRotation: setNowRotation,
        setOpacity: setNowOpacity,
        setCropTop: setNowCropTop,
        setCropBottom: setNowCropBottom,
        setCropLeft: setNowCropLeft,
        setCropRight: setNowCropRight,
      };
    }
  };

  const resetAllAdjustments = () => {
    setThenOffsetX(0);
    setThenOffsetY(0);
    setThenScale(1);
    setThenRotation(0);
    setThenOpacity(1);
    setThenCropTop(0);
    setThenCropBottom(0);
    setThenCropLeft(0);
    setThenCropRight(0);
    setNowOffsetX(0);
    setNowOffsetY(0);
    setNowScale(1);
    setNowRotation(0);
    setNowOpacity(1);
    setNowCropTop(0);
    setNowCropBottom(0);
    setNowCropLeft(0);
    setNowCropRight(0);
  };

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

  const renderSliderView = () => {
    if (!photo || !previewUrl) return null;

    return (
      <>
        {/* Desktop: Slider and controls button */}
        <Box sx={{ display: { xs: "none", md: "block" }, mb: 2 }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Box sx={{ flex: 1 }}>
              <Slider
                value={sliderValue}
                onChange={(_e, value) => setSliderValue(value as number)}
                min={0}
                max={100}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                sx={{
                  "& .MuiSlider-thumb": {
                    width: 18,
                    height: 18,
                  },
                  "& .MuiSlider-valueLabel": {
                    fontSize: "0.75rem",
                    fontWeight: 500,
                  },
                }}
              />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                  THEN ({photo.dateFormatted || "Unknown"})
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                  NOW (Satellite)
                </Typography>
              </Stack>
            </Box>
            <Button
              variant="outlined"
              startIcon={<Tune />}
              onClick={() => setControlsDrawerOpen(true)}
              size="small"
              sx={{ minWidth: 140 }}
            >
              Fine-Tune
            </Button>
          </Stack>
        </Box>

        <Box
          sx={{
            position: "relative",
            width: "100%",
            height: { xs: 350, md: 500 },
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: 4,
            bgcolor: "black",
          }}
        >
          {/* Loading overlay */}
          {(!imageLoaded || (!nowImageLoaded && !nowImageError)) && (
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
                <Typography variant="body2" color="white" fontWeight={600}>
                  {!imageLoaded ? "Loading historical photo..." : "Loading current satellite imagery"}
                </Typography>
                {!imageLoaded && nowImageLoaded === false && (
                  <Typography variant="caption" color="white" sx={{ opacity: 0.8, textAlign: "center", maxWidth: 300 }}>
                    {loadingProgress}
                  </Typography>
                )}
              </Box>
            </Fade>
          )}

          {/* Satellite imagery (background) - NOW image with transforms applied directly */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              pointerEvents: "none",
              backgroundColor: "rgba(15,23,42,0.95)",
              overflow: "hidden",
            }}
          >
            {nowImageUrl && !nowImageError ? (
              <Box
                component="img"
                src={nowImageUrl}
                alt="Current satellite imagery"
                onLoad={() => setNowImageLoaded(true)}
                onError={() => {
                  setNowImageError(true);
                  setNowImageLoaded(false);
                }}
                sx={{
                  position: "absolute",
                  // Apply crop by adjusting position and size
                  left: `${nowCropLeft}%`,
                  top: `${nowCropTop}%`,
                  right: `${nowCropRight}%`,
                  bottom: `${nowCropBottom}%`,
                  width: `calc(100% - ${nowCropLeft + nowCropRight}%)`,
                  height: `calc(100% - ${nowCropTop + nowCropBottom}%)`,
                  objectFit: "cover",
                  opacity: nowImageLoaded ? nowOpacity : 0,
                  transition: "opacity 0.3s ease-in-out",
                  // Apply transforms directly to the image in real coordinate space
                  transform: `translate(${nowOffsetX}px, ${nowOffsetY}px) scale(${nowScale}) rotate(${nowRotation}deg)`,
                  transformOrigin: "center center",
                }}
              />
            ) : (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                  px: 4,
                }}
              >
                <Typography variant="body2">
                  {nowImageError
                    ? "Unable to load satellite imagery for this area."
                    : "Preparing current satellite imagery..."}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Historical photo (foreground with slider) - THEN image with transforms applied directly */}
          {/* 
            Transform Model: All transforms (translate, scale, rotate, crop) are applied directly 
            to the image element itself, not to a wrapper container. This ensures the image moves 
            in real coordinate space relative to the viewport, not just within a masked container.
            The slider only controls visibility (clipPath), not the transform itself.
          */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              pointerEvents: "none",
              overflow: "hidden",
            }}
          >
            <Box
              component="img"
              src={previewUrl}
              alt={photo.IMAGE_NAME}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              sx={{
                position: "absolute",
                // Apply crop by adjusting position and size (pre-compositing)
                left: `${thenCropLeft}%`,
                top: `${thenCropTop}%`,
                right: `${thenCropRight}%`,
                bottom: `${thenCropBottom}%`,
                width: `calc(100% - ${thenCropLeft + thenCropRight}%)`,
                height: `calc(100% - ${thenCropTop + thenCropBottom}%)`,
                objectFit: "cover",
                opacity: imageLoaded ? thenOpacity : 0,
                transition: "opacity 0.3s ease-in-out",
                // Apply transforms directly to the image in real coordinate space
                transform: `translate(${thenOffsetX}px, ${thenOffsetY}px) scale(${thenScale}) rotate(${thenRotation}deg)`,
                transformOrigin: "center center",
                // Slider only reveals/hides the transformed image, doesn't contain the transform
                clipPath: `polygon(0 0, ${sliderValue}% 0, ${sliderValue}% 100%, 0 100%)`,
              }}
            />
          </Box>

          {/* Photo labels with active indicator */}
          {imageLoaded && nowImageLoaded && !nowImageError && (
            <Fade in timeout={500}>
              <Box>
                <Chip
                  label={`THEN (${photo.dateFormatted || "Unknown"})`}
                  size="small"
                  icon={targetImage === "then" ? <Tune sx={{ fontSize: 14 }} /> : undefined}
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    left: 16,
                    zIndex: 4,
                    bgcolor: targetImage === "then" 
                      ? (theme) => theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.9)" : "rgba(5, 150, 105, 0.9)"
                      : "rgba(0,0,0,0.7)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                    border: targetImage === "then" 
                      ? (theme) => `2px solid ${theme.palette.mode === "dark" ? "#10B981" : "#059669"}`
                      : "none",
                    fontWeight: targetImage === "then" ? 600 : 400,
                  }}
                />
                <Chip
                  label="NOW (Satellite)"
                  size="small"
                  icon={targetImage === "now" ? <Tune sx={{ fontSize: 14 }} /> : undefined}
                  sx={{
                    position: "absolute",
                    bottom: 16,
                    right: 16,
                    zIndex: 4,
                    bgcolor: targetImage === "now"
                      ? (theme) => theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.9)" : "rgba(5, 150, 105, 0.9)"
                      : "rgba(0,0,0,0.7)",
                    color: "white",
                    backdropFilter: "blur(8px)",
                    border: targetImage === "now"
                      ? (theme) => `2px solid ${theme.palette.mode === "dark" ? "#10B981" : "#059669"}`
                      : "none",
                    fontWeight: targetImage === "now" ? 600 : 400,
                  }}
                />
              </Box>
            </Fade>
          )}

          {/* Visual highlight border around active image */}
          {controlsDrawerOpen && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 3,
                pointerEvents: "none",
                border: (theme) => 
                  `3px solid ${targetImage === "then" 
                    ? (theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.6)" : "rgba(5, 150, 105, 0.6)")
                    : "transparent"}`,
                borderRadius: 3,
                transition: "border-color 0.3s ease",
              }}
            />
          )}

          {/* Slider handle - larger for mobile */}
          <Box
            onPointerDown={(e) => {
              const handle = e.currentTarget as HTMLElement | null;
              const container = handle?.parentElement;
              if (!handle || !container) return;

              const bounds = container.getBoundingClientRect();

              const updateSlider = (clientX: number) => {
                const relativeX = ((clientX - bounds.left) / bounds.width) * 100;
                setSliderValue(Math.min(100, Math.max(0, relativeX)));
              };

              try {
                handle.setPointerCapture(e.pointerId);
              } catch {
                // Ignore if pointer capture can't be set (e.g., element detached)
              }

              updateSlider(e.clientX);

              const moveListener = (event: PointerEvent) => updateSlider(event.clientX);

              const cleanup = () => {
                window.removeEventListener("pointermove", moveListener);
                window.removeEventListener("pointerup", upListener);
                window.removeEventListener("pointercancel", upListener);
              };

              const upListener = (event: PointerEvent) => {
                try {
                  if (handle.hasPointerCapture && handle.hasPointerCapture(event.pointerId)) {
                    handle.releasePointerCapture(event.pointerId);
                  }
                } catch {
                  // Ignore if releasing fails
                }
                cleanup();
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
              width: { xs: 6, md: 4 },
              bgcolor: "primary.main",
              boxShadow: (theme) => theme.palette.mode === "dark"
                ? "0 0 12px rgba(16, 185, 129, 0.6)"
                : "0 0 12px rgba(0, 77, 64, 0.4)",
              cursor: "ew-resize",
              touchAction: "none",
              zIndex: 3,
              transition: "box-shadow 0.2s ease-in-out",
              "&:hover": {
                boxShadow: (theme) => theme.palette.mode === "dark"
                  ? "0 0 20px rgba(16, 185, 129, 0.8)"
                  : "0 0 20px rgba(0, 77, 64, 0.6)",
              },
              "&::before": {
                content: '""',
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: { xs: 48, md: 40 },
                height: { xs: 48, md: 40 },
                borderRadius: "50%",
                border: (theme) => `2px solid ${theme.palette.primary.main}`,
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(0,0,0,0.7)"
                    : "rgba(255,255,255,0.9)",
                boxShadow: (theme) => theme.palette.mode === "dark"
                  ? "0 2px 8px rgba(0, 0, 0, 0.5)"
                  : "0 2px 8px rgba(0, 0, 0, 0.15)",
              },
              "&::after": {
                content: '""',
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: { xs: 28, md: 24 },
                height: 2,
                bgcolor: "primary.main",
              },
            }}
          >
            <KeyboardArrowLeft
              sx={{
                position: "absolute",
                top: "50%",
                left: { xs: -32, md: -28 },
                transform: "translateY(-50%)",
                fontSize: { xs: 24, md: 20 },
                color: "primary.main",
              }}
            />
            <KeyboardArrowRight
              sx={{
                position: "absolute",
                top: "50%",
                right: { xs: -32, md: -28 },
                transform: "translateY(-50%)",
                fontSize: { xs: 24, md: 20 },
                color: "primary.main",
              }}
            />
          </Box>
        </Box>
        
        {/* Mobile: Slider and controls button */}
        <Box sx={{ display: { xs: "block", md: "none" }, mt: 1.5, mx: 2 }}>
          <Stack spacing={1.5}>
            <Slider
              value={sliderValue}
              onChange={(_e, value) => setSliderValue(value as number)}
              min={0}
              max={100}
              valueLabelDisplay="auto"
              valueLabelFormat={(value) => `${value}%`}
              sx={{
                "& .MuiSlider-thumb": {
                  width: 24,
                  height: 24,
                },
                "& .MuiSlider-valueLabel": {
                  fontSize: "0.75rem",
                  fontWeight: 500,
                },
              }}
            />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                THEN ({photo.dateFormatted || "Unknown"})
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                NOW (Satellite)
              </Typography>
            </Stack>
            <Button
              variant="outlined"
              startIcon={<Tune />}
              onClick={() => setControlsDrawerOpen(true)}
              size="small"
              fullWidth
            >
              Fine-Tune Alignment
            </Button>
          </Stack>
        </Box>
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
      <Stack spacing={2}>
        {/* Desktop: Rotation Controls Above Images */}
        <Box sx={{ display: { xs: "none", md: "flex" }, gap: 2 }}>
          <Paper sx={{ flex: 1, p: 1.5, borderRadius: 2 }} elevation={1}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="THEN" size="small" color="primary" sx={{ fontWeight: 700 }} />
                <Typography variant="body2" fontWeight={600}>
                  {photo.dateFormatted || "Unknown Date"}
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" color="text.secondary">Rotate:</Typography>
                <ButtonGroup size="small" variant="outlined">
                  <IconButton size="small" onClick={() => setThenRotation(thenRotation - 1)} title="Rotate Left">
                    <RotateLeft fontSize="small" />
                  </IconButton>
                  <Button size="small" onClick={() => setThenRotation(0)} sx={{ minWidth: 50, px: 1, "&:not(:last-child)": { borderRight: "none" } }}>
                    {thenRotation}°
                  </Button>
                  <IconButton size="small" onClick={() => setThenRotation(thenRotation + 1)} title="Rotate Right">
                    <RotateRight fontSize="small" />
                  </IconButton>
                </ButtonGroup>
              </Stack>
            </Stack>
          </Paper>
          <Paper sx={{ flex: 1, p: 1.5, borderRadius: 2 }} elevation={1}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <Chip label="NOW" size="small" color="secondary" sx={{ fontWeight: 700 }} />
                <MapIcon color="action" fontSize="small" />
                <Typography variant="body2" fontWeight={600}>
                  Current Satellite Imagery
                </Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" color="text.secondary">Rotate:</Typography>
                <ButtonGroup size="small" variant="outlined">
                  <IconButton size="small" onClick={() => setNowRotation(nowRotation - 1)} title="Rotate Left">
                    <RotateLeft fontSize="small" />
                  </IconButton>
                  <Button size="small" onClick={() => setNowRotation(0)} sx={{ minWidth: 50, px: 1, "&:not(:last-child)": { borderRight: "none" } }}>
                    {nowRotation}°
                  </Button>
                  <IconButton size="small" onClick={() => setNowRotation(nowRotation + 1)} title="Rotate Right">
                    <RotateRight fontSize="small" />
                  </IconButton>
                </ButtonGroup>
              </Stack>
            </Stack>
          </Paper>
        </Box>

        <Stack 
          direction={{ xs: isLandscape ? "row" : "column", md: "row" }} 
          spacing={2}
          sx={{
            height: { xs: isLandscape ? "calc(100vh - 200px)" : "auto", md: "calc(100vh - 400px)" },
          }}
        >
        {/* Historical Photo */}
        <Paper sx={{ flex: 1, p: { xs: isLandscape ? 1 : 2, md: 2 }, borderRadius: 3, display: "flex", flexDirection: "column", minHeight: 0 }} elevation={3}>
          <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ display: { xs: "flex", md: "none" } }}>
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
            <Box 
              sx={{ 
                position: "relative",
                height: { xs: isLandscape ? "100%" : "auto", md: "auto" },
                minHeight: { xs: isLandscape ? 200 : "auto", md: "auto" },
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
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
                      minHeight: { xs: isLandscape ? 200 : 300, md: 300 },
                    }}
                  >
                    <CircularProgress />
                  </Box>
                </Fade>
              )}
              {imageError && (
                <Alert severity="error" sx={{ minHeight: { xs: isLandscape ? 200 : 300, md: 300 } }}>
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
                  maxHeight: { xs: isLandscape ? "100%" : 400, md: 400 },
                  height: { xs: isLandscape ? "100%" : "auto", md: "auto" },
                  opacity: imageLoaded ? 1 : 0,
                  transition: "opacity 0.3s ease-in-out, transform 0.2s ease-in-out",
                  bgcolor: "black",
                  transform: `rotate(${thenRotation}deg)`,
                }}
              />
            </Box>
            {/* Mobile: Rotation controls and scale */}
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ display: { xs: "flex", md: "none" } }}>
              {photo.SCALE && (
                <Typography variant="caption" color="text.secondary">
                  Scale: 1:{photo.SCALE.toLocaleString()}
                </Typography>
              )}
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" color="text.secondary">Rotate:</Typography>
                <ButtonGroup size="small" variant="outlined">
                  <IconButton size="small" onClick={() => setThenRotation(thenRotation - 1)} title="Rotate Left">
                    <RotateLeft fontSize="small" />
                  </IconButton>
                  <Button size="small" onClick={() => setThenRotation(0)} sx={{ minWidth: 50, px: 1, "&:not(:last-child)": { borderRight: "none" } }}>
                    {thenRotation}°
                  </Button>
                  <IconButton size="small" onClick={() => setThenRotation(thenRotation + 1)} title="Rotate Right">
                    <RotateRight fontSize="small" />
                  </IconButton>
                </ButtonGroup>
              </Stack>
            </Stack>
            {/* Desktop: Scale only */}
            {photo.SCALE && (
              <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" } }}>
                Scale: 1:{photo.SCALE.toLocaleString()}
              </Typography>
            )}
          </Stack>
        </Paper>

        {/* Current View */}
        <Paper sx={{ flex: 1, p: { xs: isLandscape ? 1 : 2, md: 2 }, borderRadius: 3, display: "flex", flexDirection: "column", minHeight: 0 }} elevation={3}>
          <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "flex", md: "none" } }}>
              <Chip
                label="NOW"
                size="small"
                color="secondary"
                sx={{ fontWeight: 700 }}
              />
              <MapIcon color="action" fontSize="small" />
              <Typography variant="subtitle1" fontWeight={700}>
                Current Satellite Imagery
              </Typography>
            </Stack>
            <Box
              sx={{
                width: "100%",
                height: { xs: isLandscape ? "100%" : 320, md: 400 },
                borderRadius: 2,
                overflow: "hidden",
                position: "relative",
                bgcolor: "grey.900",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: { xs: isLandscape ? 200 : 320, md: 400 },
              }}
            >
              {nowImageUrl && !nowImageError ? (
                <Box
                  component="img"
                  src={nowImageUrl}
                  alt="Current satellite imagery"
                  onLoad={() => setNowImageLoaded(true)}
                  onError={() => setNowImageError(true)}
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    bgcolor: "black",
                    transition: "transform 0.2s ease-in-out",
                    transform: `rotate(${nowRotation}deg)`,
                  }}
                />
              ) : (
                <Stack spacing={1} alignItems="center" color="white" sx={{ textAlign: "center", px: 3 }}>
                  <CircularProgress color="inherit" />
                  <Typography variant="body2" fontWeight={600}>
                    {nowImageError
                      ? "Unable to load satellite imagery for this area."
                      : "Loading current satellite imagery"}
                  </Typography>
                  {!nowImageError && (
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      {loadingProgress}
                    </Typography>
                  )}
                </Stack>
              )}
            </Box>
            {/* Mobile: Rotation controls */}
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ display: { xs: "flex", md: "none" } }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic" }}>
                Data source: Esri World Imagery service.
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography variant="caption" color="text.secondary">Rotate:</Typography>
                <ButtonGroup size="small" variant="outlined">
                  <IconButton size="small" onClick={() => setNowRotation(nowRotation - 1)} title="Rotate Left">
                    <RotateLeft fontSize="small" />
                  </IconButton>
                  <Button size="small" onClick={() => setNowRotation(0)} sx={{ minWidth: 50, px: 1, "&:not(:last-child)": { borderRight: "none" } }}>
                    {nowRotation}°
                  </Button>
                  <IconButton size="small" onClick={() => setNowRotation(nowRotation + 1)} title="Rotate Right">
                    <RotateRight fontSize="small" />
                  </IconButton>
                </ButtonGroup>
              </Stack>
            </Stack>
            {/* Desktop: Data source only */}
            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", display: { xs: "none", md: "block" } }}>
              Data source: Esri World Imagery service.
            </Typography>
          </Stack>
        </Paper>
        </Stack>
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
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 1, pt: 2.5, pb: 1.5 }}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 500 }}>
              Then vs Now
            </Typography>
            <Tooltip
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography variant="body2" sx={{ mb: 1, fontSize: "0.875rem" }}>
                    <strong>Note on alignment:</strong>
                  </Typography>
                  <Typography variant="caption" component="div" sx={{ fontSize: "0.75rem" }}>
                    The historical photo and current satellite imagery may not align perfectly because:
                  </Typography>
                  <Typography variant="caption" component="ul" sx={{ mt: 0.5, pl: 2, fontSize: "0.75rem" }}>
                    <li>Historical photos used different projection systems</li>
                    <li>Camera angles and perspectives vary</li>
                    <li>Terrain changes over time affect georeferencing</li>
                    <li>Modern satellite imagery uses different capture methods</li>
                  </Typography>
                  <Typography variant="caption" sx={{ mt: 1, display: "block", fontStyle: "italic", fontSize: "0.75rem" }}>
                    Use this feature to compare general area changes rather than precise measurements.
                  </Typography>
                </Box>
              }
              arrow
              placement="bottom-start"
            >
              <InfoOutlined sx={{ fontSize: 18, color: "text.secondary", cursor: "help" }} />
            </Tooltip>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8125rem" }}>
            Compare historical aerial photography with current satellite imagery
          </Typography>
        </Stack>
        <IconButton onClick={onClose} aria-label="Close Then vs Now modal" size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2, pb: { xs: 2, md: 1 }, px: { xs: 2, md: 3 } }}>
        {photo && (
          <Tabs
            value={tab}
            onChange={(_e, value) => setTab(value)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ 
              mb: 2,
              "& .MuiTab-root": {
                fontSize: "0.8125rem",
                fontWeight: 500,
                textTransform: "none",
                minHeight: 40,
                px: 2,
              },
            }}
          >
            <Tab label="Side-by-Side" value="side-by-side" />
            <Tab label="Slider Comparison" value="slider" />
          </Tabs>
        )}
        {renderContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: "divider", justifyContent: "flex-end", gap: 1 }}>
        <Button onClick={onClose} color="inherit" size="medium" sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
          Close
        </Button>
        {photo && photo.DOWNLOAD_LINK ? (
          <Button
            variant="contained"
            component="a"
            href={photo.DOWNLOAD_LINK}
            target="_blank"
            rel="noopener noreferrer"
            size="medium"
            sx={{ fontSize: "0.875rem", fontWeight: 500 }}
          >
            Download TIFF
          </Button>
        ) : (
          <Button variant="contained" disabled size="medium" sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
            Download TIFF
          </Button>
        )}
      </DialogActions>

      {/* Fine-Tune Alignment Drawer - Desktop: Side drawer */}
      <Portal container={document.body}>
        <Drawer
          anchor="right"
          open={controlsDrawerOpen && !isMobile}
          onClose={() => setControlsDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: { xs: "100%", sm: 360 },
              maxWidth: "90vw",
              zIndex: 1400, // Higher than modal (1300)
            },
          }}
          ModalProps={{
            container: document.body,
            style: { zIndex: 1400 },
          }}
        >
        <Box sx={{ p: 2.5, height: "100%", overflowY: "auto" }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
            <Typography variant="h6" sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
              Fine-Tune Alignment
            </Typography>
            <IconButton 
              onClick={() => setControlsDrawerOpen(false)} 
              size="small" 
              aria-label="Close drawer"
              sx={{
                color: "text.primary",
                "&:hover": {
                  bgcolor: "action.hover",
                },
              }}
            >
              <Close />
            </IconButton>
          </Stack>

          {/* Target Image Selector */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, mb: 1, display: "block", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Target Image
            </Typography>
            <ButtonGroup fullWidth size="small" variant="outlined">
              <Button
                variant={targetImage === "then" ? "contained" : "outlined"}
                startIcon={<Image />}
                onClick={() => setTargetImage("then")}
                sx={{
                  textTransform: "none",
                  fontWeight: targetImage === "then" ? 600 : 500,
                  "&.MuiButton-contained": {
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                    "&:hover": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "#34D399" : "#047857",
                    },
                  },
                }}
              >
                THEN
              </Button>
              <Button
                variant={targetImage === "now" ? "contained" : "outlined"}
                startIcon={<Satellite />}
                onClick={() => setTargetImage("now")}
                sx={{
                  textTransform: "none",
                  fontWeight: targetImage === "now" ? 600 : 500,
                  "&.MuiButton-contained": {
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                    "&:hover": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "#34D399" : "#047857",
                    },
                  },
                }}
              >
                NOW
              </Button>
            </ButtonGroup>
          </Box>

          <Divider sx={{ mb: 3 }} />

          <Stack spacing={3}>
            {/* Position Controls */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
                  Position
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    const transforms = getCurrentTransforms();
                    transforms.setOffsetX(0);
                    transforms.setOffsetY(0);
                  }}
                  sx={{
                    color: "text.secondary",
                    "&:hover": {
                      bgcolor: "action.hover",
                      color: "text.primary",
                    },
                  }}
                  title="Reset position"
                >
                  <RestartAlt fontSize="small" />
                </IconButton>
              </Stack>
              <Stack direction="row" spacing={1} mb={1.5}>
                <ButtonGroup size="small" variant="outlined" sx={{ flex: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setOffsetY(transforms.offsetY - 5);
                    }}
                    sx={{
                      borderColor: "divider",
                      color: "text.primary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "primary.main",
                      },
                    }}
                    title="Move up"
                  >
                    <ArrowUpward fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setOffsetY(transforms.offsetY + 5);
                    }}
                    sx={{
                      borderColor: "divider",
                      color: "text.primary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "primary.main",
                      },
                    }}
                    title="Move down"
                  >
                    <ArrowDownward fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setOffsetX(transforms.offsetX - 5);
                    }}
                    sx={{
                      borderColor: "divider",
                      color: "text.primary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "primary.main",
                      },
                    }}
                    title="Move left"
                  >
                    <ArrowBack fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setOffsetX(transforms.offsetX + 5);
                    }}
                    sx={{
                      borderColor: "divider",
                      color: "text.primary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "primary.main",
                      },
                    }}
                    title="Move right"
                  >
                    <ArrowForward fontSize="small" />
                  </IconButton>
                </ButtonGroup>
              </Stack>
              <Stack direction="row" spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                      X
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                      {getCurrentTransforms().offsetX}
                    </Typography>
                  </Stack>
                  <Slider
                    value={getCurrentTransforms().offsetX}
                    onChange={(_e, v) => getCurrentTransforms().setOffsetX(v as number)}
                    min={-200}
                    max={200}
                    step={1}
                    size="small"
                    sx={{
                      "& .MuiSlider-thumb": {
                        width: 18,
                        height: 18,
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                        "&:hover": {
                          boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                        },
                      },
                      "& .MuiSlider-track": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: "none",
                      },
                      "& .MuiSlider-rail": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                        opacity: 1,
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                      Y
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                      {getCurrentTransforms().offsetY}
                    </Typography>
                  </Stack>
                  <Slider
                    value={getCurrentTransforms().offsetY}
                    onChange={(_e, v) => getCurrentTransforms().setOffsetY(v as number)}
                    min={-200}
                    max={200}
                    step={1}
                    size="small"
                    sx={{
                      "& .MuiSlider-thumb": {
                        width: 18,
                        height: 18,
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                        "&:hover": {
                          boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                        },
                      },
                      "& .MuiSlider-track": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: "none",
                      },
                      "& .MuiSlider-rail": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                        opacity: 1,
                      },
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* Scale Control */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
                  Scale
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary", minWidth: 50, textAlign: "right" }}>
                    {getCurrentTransforms().scale.toFixed(2)}x
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setScale(1);
                    }}
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        color: "text.primary",
                      },
                    }}
                    title="Reset scale"
                  >
                    <RestartAlt fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} mb={1.5}>
                <ButtonGroup size="small" variant="outlined">
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setScale(Math.max(0.5, transforms.scale - 0.05));
                    }}
                    sx={{
                      borderColor: "divider",
                      color: "text.primary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "primary.main",
                      },
                    }}
                    title="Zoom out"
                  >
                    <ZoomOut fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setScale(Math.min(2, transforms.scale + 0.05));
                    }}
                    sx={{
                      borderColor: "divider",
                      color: "text.primary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "primary.main",
                      },
                    }}
                    title="Zoom in"
                  >
                    <ZoomIn fontSize="small" />
                  </IconButton>
                </ButtonGroup>
              </Stack>
              <Slider
                value={getCurrentTransforms().scale}
                onChange={(_e, v) => getCurrentTransforms().setScale(v as number)}
                min={0.5}
                max={2}
                step={0.01}
                size="small"
                sx={{
                  "& .MuiSlider-thumb": {
                    width: 18,
                    height: 18,
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                    border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                    "&:hover": {
                      boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                    },
                  },
                  "& .MuiSlider-track": {
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                    border: "none",
                  },
                  "& .MuiSlider-rail": {
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                    opacity: 1,
                  },
                }}
              />
            </Box>

            <Divider />

            {/* Rotation Control */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
                  Rotation
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary", minWidth: 50, textAlign: "right" }}>
                    {Math.round(getCurrentTransforms().rotation)}°
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setRotation(0);
                    }}
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        color: "text.primary",
                      },
                    }}
                    title="Reset rotation"
                  >
                    <RestartAlt fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={1} mb={1.5} alignItems="center">
                <ButtonGroup size="small" variant="outlined">
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setRotation(transforms.rotation - 1);
                    }}
                    sx={{
                      borderColor: "divider",
                      color: "text.primary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "primary.main",
                      },
                    }}
                    title="Rotate left"
                  >
                    <RotateLeft fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setRotation(transforms.rotation + 1);
                    }}
                    sx={{
                      borderColor: "divider",
                      color: "text.primary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        borderColor: "primary.main",
                      },
                    }}
                    title="Rotate right"
                  >
                    <RotateRight fontSize="small" />
                  </IconButton>
                </ButtonGroup>
              </Stack>
              <Slider
                value={getCurrentTransforms().rotation}
                onChange={(_e, v) => getCurrentTransforms().setRotation(v as number)}
                min={-45}
                max={45}
                step={0.1}
                size="small"
                sx={{
                  "& .MuiSlider-thumb": {
                    width: 18,
                    height: 18,
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                    border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                    "&:hover": {
                      boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                    },
                  },
                  "& .MuiSlider-track": {
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                    border: "none",
                  },
                  "& .MuiSlider-rail": {
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                    opacity: 1,
                  },
                }}
              />
            </Box>

            <Divider />

            {/* Opacity Control */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
                  Opacity
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary", minWidth: 50, textAlign: "right" }}>
                    {Math.round(getCurrentTransforms().opacity * 100)}%
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setOpacity(1);
                    }}
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        color: "text.primary",
                      },
                    }}
                    title="Reset opacity"
                  >
                    <RestartAlt fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
              <Slider
                value={getCurrentTransforms().opacity}
                onChange={(_e, v) => getCurrentTransforms().setOpacity(v as number)}
                min={0}
                max={1}
                step={0.01}
                size="small"
                sx={{
                  "& .MuiSlider-thumb": {
                    width: 18,
                    height: 18,
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                    border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                    "&:hover": {
                      boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                    },
                  },
                  "& .MuiSlider-track": {
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                    border: "none",
                  },
                  "& .MuiSlider-rail": {
                    bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                    opacity: 1,
                  },
                }}
              />
            </Box>

            <Divider />

            {/* Crop Controls */}
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
                  Crop Edges
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    const transforms = getCurrentTransforms();
                    transforms.setCropTop(0);
                    transforms.setCropBottom(0);
                    transforms.setCropLeft(0);
                    transforms.setCropRight(0);
                  }}
                  sx={{
                    color: "text.secondary",
                    "&:hover": {
                      bgcolor: "action.hover",
                      color: "text.primary",
                    },
                  }}
                  title="Reset crop"
                >
                  <RestartAlt fontSize="small" />
                </IconButton>
              </Stack>
              <Stack spacing={2}>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                      Top
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                      {getCurrentTransforms().cropTop.toFixed(1)}%
                    </Typography>
                  </Stack>
                  <Slider
                    value={getCurrentTransforms().cropTop}
                    onChange={(_e, v) => getCurrentTransforms().setCropTop(v as number)}
                    min={0}
                    max={20}
                    step={0.1}
                    size="small"
                    sx={{
                      "& .MuiSlider-thumb": {
                        width: 18,
                        height: 18,
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                        "&:hover": {
                          boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                        },
                      },
                      "& .MuiSlider-track": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: "none",
                      },
                      "& .MuiSlider-rail": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                        opacity: 1,
                      },
                    }}
                  />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                      Bottom
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                      {getCurrentTransforms().cropBottom.toFixed(1)}%
                    </Typography>
                  </Stack>
                  <Slider
                    value={getCurrentTransforms().cropBottom}
                    onChange={(_e, v) => getCurrentTransforms().setCropBottom(v as number)}
                    min={0}
                    max={20}
                    step={0.1}
                    size="small"
                    sx={{
                      "& .MuiSlider-thumb": {
                        width: 18,
                        height: 18,
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                        "&:hover": {
                          boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                        },
                      },
                      "& .MuiSlider-track": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: "none",
                      },
                      "& .MuiSlider-rail": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                        opacity: 1,
                      },
                    }}
                  />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                      Left
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                      {getCurrentTransforms().cropLeft.toFixed(1)}%
                    </Typography>
                  </Stack>
                  <Slider
                    value={getCurrentTransforms().cropLeft}
                    onChange={(_e, v) => getCurrentTransforms().setCropLeft(v as number)}
                    min={0}
                    max={20}
                    step={0.1}
                    size="small"
                    sx={{
                      "& .MuiSlider-thumb": {
                        width: 18,
                        height: 18,
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                        "&:hover": {
                          boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                        },
                      },
                      "& .MuiSlider-track": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: "none",
                      },
                      "& .MuiSlider-rail": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                        opacity: 1,
                      },
                    }}
                  />
                </Box>
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                      Right
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                      {getCurrentTransforms().cropRight.toFixed(1)}%
                    </Typography>
                  </Stack>
                  <Slider
                    value={getCurrentTransforms().cropRight}
                    onChange={(_e, v) => getCurrentTransforms().setCropRight(v as number)}
                    min={0}
                    max={20}
                    step={0.1}
                    size="small"
                    sx={{
                      "& .MuiSlider-thumb": {
                        width: 18,
                        height: 18,
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                        "&:hover": {
                          boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                        },
                      },
                      "& .MuiSlider-track": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                        border: "none",
                      },
                      "& .MuiSlider-rail": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                        opacity: 1,
                      },
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            <Divider />

            <Button
              variant="outlined"
              startIcon={<RestartAlt />}
              onClick={resetAllAdjustments}
              fullWidth
              size="medium"
              sx={{
                mt: 1,
                textTransform: "none",
                fontWeight: 500,
                borderColor: "divider",
                color: "text.primary",
                "&:hover": {
                  bgcolor: "action.hover",
                  borderColor: "primary.main",
                },
              }}
            >
              Reset All Adjustments
            </Button>
          </Stack>
        </Box>
      </Drawer>
      </Portal>

      {/* Fine-Tune Alignment Drawer - Mobile: Bottom drawer */}
      <Portal container={document.body}>
        <Drawer
          anchor="bottom"
          open={controlsDrawerOpen && isMobile}
          onClose={() => setControlsDrawerOpen(false)}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: "80vh",
              zIndex: 1400, // Higher than modal (1300)
            },
          }}
          ModalProps={{
            container: document.body,
            style: { zIndex: 1400 },
          }}
        >
          <Box sx={{ p: 2.5, height: "100%", overflowY: "auto" }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
              <Typography variant="h6" sx={{ fontSize: "1.125rem", fontWeight: 600 }}>
                Fine-Tune Alignment
              </Typography>
              <IconButton 
                onClick={() => setControlsDrawerOpen(false)} 
                size="small" 
                aria-label="Close drawer"
                sx={{
                  color: "text.primary",
                  "&:hover": {
                    bgcolor: "action.hover",
                  },
                }}
              >
                <Close />
              </IconButton>
            </Stack>

            {/* Target Image Selector */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, mb: 1, display: "block", color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Target Image
              </Typography>
              <ButtonGroup fullWidth size="small" variant="outlined">
                <Button
                  variant={targetImage === "then" ? "contained" : "outlined"}
                  startIcon={<Image />}
                  onClick={() => setTargetImage("then")}
                  sx={{
                    textTransform: "none",
                    fontWeight: targetImage === "then" ? 600 : 500,
                    "&.MuiButton-contained": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                      "&:hover": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#34D399" : "#047857",
                      },
                    },
                  }}
                >
                  THEN
                </Button>
                <Button
                  variant={targetImage === "now" ? "contained" : "outlined"}
                  startIcon={<Satellite />}
                  onClick={() => setTargetImage("now")}
                  sx={{
                    textTransform: "none",
                    fontWeight: targetImage === "now" ? 600 : 500,
                    "&.MuiButton-contained": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                      "&:hover": {
                        bgcolor: (theme) => theme.palette.mode === "dark" ? "#34D399" : "#047857",
                      },
                    },
                  }}
                >
                  NOW
                </Button>
              </ButtonGroup>
            </Box>

            <Divider sx={{ mb: 3 }} />

            <Stack spacing={3}>
              {/* Position Controls */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
                    Position
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setOffsetX(0);
                      transforms.setOffsetY(0);
                    }}
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        color: "text.primary",
                      },
                    }}
                    title="Reset position"
                  >
                    <RestartAlt fontSize="small" />
                  </IconButton>
                </Stack>
                <Stack direction="row" spacing={1} mb={1.5}>
                  <ButtonGroup size="small" variant="outlined" sx={{ flex: 1 }}>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const transforms = getCurrentTransforms();
                        transforms.setOffsetY(transforms.offsetY - 5);
                      }}
                      sx={{
                        borderColor: "divider",
                        color: "text.primary",
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "primary.main",
                        },
                      }}
                      title="Move up"
                    >
                      <ArrowUpward fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const transforms = getCurrentTransforms();
                        transforms.setOffsetY(transforms.offsetY + 5);
                      }}
                      sx={{
                        borderColor: "divider",
                        color: "text.primary",
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "primary.main",
                        },
                      }}
                      title="Move down"
                    >
                      <ArrowDownward fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const transforms = getCurrentTransforms();
                        transforms.setOffsetX(transforms.offsetX - 5);
                      }}
                      sx={{
                        borderColor: "divider",
                        color: "text.primary",
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "primary.main",
                        },
                      }}
                      title="Move left"
                    >
                      <ArrowBack fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const transforms = getCurrentTransforms();
                        transforms.setOffsetX(transforms.offsetX + 5);
                      }}
                      sx={{
                        borderColor: "divider",
                        color: "text.primary",
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "primary.main",
                        },
                      }}
                      title="Move right"
                    >
                      <ArrowForward fontSize="small" />
                    </IconButton>
                  </ButtonGroup>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                        X
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                        {getCurrentTransforms().offsetX}
                      </Typography>
                    </Stack>
                    <Slider
                      value={getCurrentTransforms().offsetX}
                      onChange={(_e, v) => getCurrentTransforms().setOffsetX(v as number)}
                      min={-200}
                      max={200}
                      step={1}
                      size="small"
                      sx={{
                        "& .MuiSlider-thumb": {
                          width: 20,
                          height: 20,
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                          "&:hover": {
                            boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                          },
                        },
                        "& .MuiSlider-track": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: "none",
                        },
                        "& .MuiSlider-rail": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                          opacity: 1,
                        },
                      }}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                        Y
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                        {getCurrentTransforms().offsetY}
                      </Typography>
                    </Stack>
                    <Slider
                      value={getCurrentTransforms().offsetY}
                      onChange={(_e, v) => getCurrentTransforms().setOffsetY(v as number)}
                      min={-200}
                      max={200}
                      step={1}
                      size="small"
                      sx={{
                        "& .MuiSlider-thumb": {
                          width: 20,
                          height: 20,
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                          "&:hover": {
                            boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                          },
                        },
                        "& .MuiSlider-track": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: "none",
                        },
                        "& .MuiSlider-rail": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                          opacity: 1,
                        },
                      }}
                    />
                  </Box>
                </Stack>
              </Box>

              <Divider />

              {/* Scale Control */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
                    Scale
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary", minWidth: 50, textAlign: "right" }}>
                      {getCurrentTransforms().scale.toFixed(2)}x
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const transforms = getCurrentTransforms();
                        transforms.setScale(1);
                      }}
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          bgcolor: "action.hover",
                          color: "text.primary",
                        },
                      }}
                      title="Reset scale"
                    >
                      <RestartAlt fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={1} mb={1.5}>
                  <ButtonGroup size="small" variant="outlined">
                    <IconButton
                      size="small"
                      onClick={() => {
                        const transforms = getCurrentTransforms();
                        transforms.setScale(Math.max(0.5, transforms.scale - 0.05));
                      }}
                      sx={{
                        borderColor: "divider",
                        color: "text.primary",
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "primary.main",
                        },
                      }}
                      title="Zoom out"
                    >
                      <ZoomOut fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const transforms = getCurrentTransforms();
                        transforms.setScale(Math.min(2, transforms.scale + 0.05));
                      }}
                      sx={{
                        borderColor: "divider",
                        color: "text.primary",
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "primary.main",
                        },
                      }}
                      title="Zoom in"
                    >
                      <ZoomIn fontSize="small" />
                    </IconButton>
                  </ButtonGroup>
                </Stack>
                <Slider
                  value={getCurrentTransforms().scale}
                  onChange={(_e, v) => getCurrentTransforms().setScale(v as number)}
                  min={0.5}
                  max={2}
                  step={0.01}
                  size="small"
                  sx={{
                    "& .MuiSlider-thumb": {
                      width: 20,
                      height: 20,
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                      border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                      "&:hover": {
                        boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                      },
                    },
                    "& .MuiSlider-track": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                      border: "none",
                    },
                    "& .MuiSlider-rail": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                      opacity: 1,
                    },
                  }}
                />
              </Box>

              <Divider />

              {/* Rotation Control */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
                    Rotation
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary", minWidth: 50, textAlign: "right" }}>
                      {Math.round(getCurrentTransforms().rotation)}°
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const transforms = getCurrentTransforms();
                        transforms.setRotation(0);
                      }}
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          bgcolor: "action.hover",
                          color: "text.primary",
                        },
                      }}
                      title="Reset rotation"
                    >
                      <RestartAlt fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                <Stack direction="row" spacing={1} mb={1.5} alignItems="center">
                  <ButtonGroup size="small" variant="outlined">
                    <IconButton
                      size="small"
                      onClick={() => {
                        const transforms = getCurrentTransforms();
                        transforms.setRotation(transforms.rotation - 1);
                      }}
                      sx={{
                        borderColor: "divider",
                        color: "text.primary",
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "primary.main",
                        },
                      }}
                      title="Rotate left"
                    >
                      <RotateLeft fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const transforms = getCurrentTransforms();
                        transforms.setRotation(transforms.rotation + 1);
                      }}
                      sx={{
                        borderColor: "divider",
                        color: "text.primary",
                        "&:hover": {
                          bgcolor: "action.hover",
                          borderColor: "primary.main",
                        },
                      }}
                      title="Rotate right"
                    >
                      <RotateRight fontSize="small" />
                    </IconButton>
                  </ButtonGroup>
                </Stack>
                <Slider
                  value={getCurrentTransforms().rotation}
                  onChange={(_e, v) => getCurrentTransforms().setRotation(v as number)}
                  min={-45}
                  max={45}
                  step={0.1}
                  size="small"
                  sx={{
                    "& .MuiSlider-thumb": {
                      width: 20,
                      height: 20,
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                      border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                      "&:hover": {
                        boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                      },
                    },
                    "& .MuiSlider-track": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                      border: "none",
                    },
                    "& .MuiSlider-rail": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                      opacity: 1,
                    },
                  }}
                />
              </Box>

              <Divider />

              {/* Opacity Control */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
                    Opacity
                  </Typography>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary", minWidth: 50, textAlign: "right" }}>
                      {Math.round(getCurrentTransforms().opacity * 100)}%
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => {
                        const transforms = getCurrentTransforms();
                        transforms.setOpacity(1);
                      }}
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          bgcolor: "action.hover",
                          color: "text.primary",
                        },
                      }}
                      title="Reset opacity"
                    >
                      <RestartAlt fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
                <Slider
                  value={getCurrentTransforms().opacity}
                  onChange={(_e, v) => getCurrentTransforms().setOpacity(v as number)}
                  min={0}
                  max={1}
                  step={0.01}
                  size="small"
                  sx={{
                    "& .MuiSlider-thumb": {
                      width: 20,
                      height: 20,
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                      border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                      "&:hover": {
                        boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                      },
                    },
                    "& .MuiSlider-track": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                      border: "none",
                    },
                    "& .MuiSlider-rail": {
                      bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                      opacity: 1,
                    },
                  }}
                />
              </Box>

              <Divider />

              {/* Crop Controls */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="subtitle2" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "text.primary" }}>
                    Crop Edges
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      const transforms = getCurrentTransforms();
                      transforms.setCropTop(0);
                      transforms.setCropBottom(0);
                      transforms.setCropLeft(0);
                      transforms.setCropRight(0);
                    }}
                    sx={{
                      color: "text.secondary",
                      "&:hover": {
                        bgcolor: "action.hover",
                        color: "text.primary",
                      },
                    }}
                    title="Reset crop"
                  >
                    <RestartAlt fontSize="small" />
                  </IconButton>
                </Stack>
                <Stack spacing={2}>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                        Top
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                        {getCurrentTransforms().cropTop.toFixed(1)}%
                      </Typography>
                    </Stack>
                    <Slider
                      value={getCurrentTransforms().cropTop}
                      onChange={(_e, v) => getCurrentTransforms().setCropTop(v as number)}
                      min={0}
                      max={20}
                      step={0.1}
                      size="small"
                      sx={{
                        "& .MuiSlider-thumb": {
                          width: 20,
                          height: 20,
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                          "&:hover": {
                            boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                          },
                        },
                        "& .MuiSlider-track": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: "none",
                        },
                        "& .MuiSlider-rail": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                          opacity: 1,
                        },
                      }}
                    />
                  </Box>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                        Bottom
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                        {getCurrentTransforms().cropBottom.toFixed(1)}%
                      </Typography>
                    </Stack>
                    <Slider
                      value={getCurrentTransforms().cropBottom}
                      onChange={(_e, v) => getCurrentTransforms().setCropBottom(v as number)}
                      min={0}
                      max={20}
                      step={0.1}
                      size="small"
                      sx={{
                        "& .MuiSlider-thumb": {
                          width: 20,
                          height: 20,
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                          "&:hover": {
                            boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                          },
                        },
                        "& .MuiSlider-track": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: "none",
                        },
                        "& .MuiSlider-rail": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                          opacity: 1,
                        },
                      }}
                    />
                  </Box>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                        Left
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                        {getCurrentTransforms().cropLeft.toFixed(1)}%
                      </Typography>
                    </Stack>
                    <Slider
                      value={getCurrentTransforms().cropLeft}
                      onChange={(_e, v) => getCurrentTransforms().setCropLeft(v as number)}
                      min={0}
                      max={20}
                      step={0.1}
                      size="small"
                      sx={{
                        "& .MuiSlider-thumb": {
                          width: 20,
                          height: 20,
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                          "&:hover": {
                            boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                          },
                        },
                        "& .MuiSlider-track": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: "none",
                        },
                        "& .MuiSlider-rail": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                          opacity: 1,
                        },
                      }}
                    />
                  </Box>
                  <Box>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 500, color: "text.secondary" }}>
                        Right
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.primary" }}>
                        {getCurrentTransforms().cropRight.toFixed(1)}%
                      </Typography>
                    </Stack>
                    <Slider
                      value={getCurrentTransforms().cropRight}
                      onChange={(_e, v) => getCurrentTransforms().setCropRight(v as number)}
                      min={0}
                      max={20}
                      step={0.1}
                      size="small"
                      sx={{
                        "& .MuiSlider-thumb": {
                          width: 20,
                          height: 20,
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: (theme) => `2px solid ${theme.palette.mode === "dark" ? "#1A1A1A" : "#FFFFFF"}`,
                          "&:hover": {
                            boxShadow: (theme) => `0 0 0 8px ${theme.palette.mode === "dark" ? "rgba(16, 185, 129, 0.16)" : "rgba(5, 150, 105, 0.16)"}`,
                          },
                        },
                        "& .MuiSlider-track": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "#10B981" : "#059669",
                          border: "none",
                        },
                        "& .MuiSlider-rail": {
                          bgcolor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
                          opacity: 1,
                        },
                      }}
                    />
                  </Box>
                </Stack>
              </Box>

              <Divider />

              <Button
                variant="outlined"
                startIcon={<RestartAlt />}
                onClick={resetAllAdjustments}
                fullWidth
                size="medium"
                sx={{
                  mt: 1,
                  textTransform: "none",
                  fontWeight: 500,
                  borderColor: "divider",
                  color: "text.primary",
                  "&:hover": {
                    bgcolor: "action.hover",
                    borderColor: "primary.main",
                  },
                }}
              >
                Reset All Adjustments
              </Button>
            </Stack>
          </Box>
        </Drawer>
      </Portal>
    </Dialog>
  );
}

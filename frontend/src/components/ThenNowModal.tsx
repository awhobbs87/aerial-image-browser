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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  ButtonGroup,
  Divider,
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
  Opacity as OpacityIcon,
  Crop,
  ExpandMore,
  ArrowUpward,
  ArrowDownward,
  ArrowBack,
  ArrowForward,
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

  // Interactive adjustment controls
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [opacity, setOpacity] = useState(1);
  const [cropTop, setCropTop] = useState(0);
  const [cropBottom, setCropBottom] = useState(0);
  const [cropLeft, setCropLeft] = useState(0);
  const [cropRight, setCropRight] = useState(0);
  
  // Side-by-side rotation controls
  const [thenRotation, setThenRotation] = useState(0);
  const [nowRotation, setNowRotation] = useState(0);
  
  // Loading progress tracking
  const [loadingProgress, setLoadingProgress] = useState<string>("Initializing...");

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
      setOffsetX(0);
      setOffsetY(0);
      setScale(1);
      setRotation(0);
      setOpacity(1);
      setCropTop(0);
      setCropBottom(0);
      setCropLeft(0);
      setCropRight(0);
      setThenRotation(0);
      setNowRotation(0);
      setLoadingProgress("Initializing...");
    }
  }, [photo, open]);

  const resetAdjustments = () => {
    setOffsetX(0);
    setOffsetY(0);
    setScale(1);
    setRotation(0);
    setOpacity(1);
    setCropTop(0);
    setCropBottom(0);
    setCropLeft(0);
    setCropRight(0);
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
        {/* Desktop: Controls above image */}
        <Box sx={{ display: { xs: "none", md: "block" }, mb: 2 }}>
          <Box sx={{ mb: 2 }}>
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
          
          {/* Fine-Tune Alignment Controls - Desktop only above image */}
          <Accordion 
            className="rounded-xl"
            sx={{ 
              borderRadius: 2,
              '&:before': {
                display: 'none',
              },
            }} 
            elevation={1}
          >
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              className="px-4 py-2"
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Tune />
                <Typography variant="subtitle2" className="font-semibold">
                  Fine-Tune Alignment
                </Typography>
                <Chip label="Advanced" size="small" color="primary" variant="outlined" />
              </Stack>
            </AccordionSummary>
            <AccordionDetails className="px-4 py-3">
              <Stack spacing={3}>
                <Alert severity="info" icon={<Info />}>
                  Adjust the historical photo to better align with the satellite imagery. Use these controls to compensate for perspective differences and remove film artifacts.
                </Alert>

                {/* Position Controls */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight={600}>Position</Typography>
                    <ButtonGroup size="small" variant="outlined">
                      <Button onClick={() => setOffsetY(offsetY - 5)} title="Move Up"><ArrowUpward fontSize="small" /></Button>
                      <Button onClick={() => setOffsetY(offsetY + 5)} title="Move Down"><ArrowDownward fontSize="small" /></Button>
                      <Button onClick={() => setOffsetX(offsetX - 5)} title="Move Left"><ArrowBack fontSize="small" /></Button>
                      <Button onClick={() => setOffsetX(offsetX + 5)} title="Move Right"><ArrowForward fontSize="small" /></Button>
                    </ButtonGroup>
                  </Stack>
                  <Stack direction="row" spacing={2}>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary">X: {offsetX}px</Typography>
                      <Slider value={offsetX} onChange={(_e, v) => setOffsetX(v as number)} min={-200} max={200} step={1} size="small" />
                    </Box>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary">Y: {offsetY}px</Typography>
                      <Slider value={offsetY} onChange={(_e, v) => setOffsetY(v as number)} min={-200} max={200} step={1} size="small" />
                    </Box>
                  </Stack>
                </Box>

                <Divider />

                {/* Scale Control */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight={600}>Scale: {scale.toFixed(2)}x</Typography>
                    <ButtonGroup size="small" variant="outlined">
                      <Button onClick={() => setScale(Math.max(0.5, scale - 0.05))} title="Zoom Out"><ZoomOut fontSize="small" /></Button>
                      <Button onClick={() => setScale(Math.min(2, scale + 0.05))} title="Zoom In"><ZoomIn fontSize="small" /></Button>
                    </ButtonGroup>
                  </Stack>
                  <Slider value={scale} onChange={(_e, v) => setScale(v as number)} min={0.5} max={2} step={0.01} size="small" />
                </Box>

                <Divider />

                {/* Rotation Control */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" fontWeight={600}>Rotation: {rotation}°</Typography>
                    <ButtonGroup size="small" variant="outlined">
                      <Button onClick={() => setRotation(rotation - 1)} title="Rotate Left"><RotateLeft fontSize="small" /></Button>
                      <Button onClick={() => setRotation(rotation + 1)} title="Rotate Right"><RotateRight fontSize="small" /></Button>
                    </ButtonGroup>
                  </Stack>
                  <Slider value={rotation} onChange={(_e, v) => setRotation(v as number)} min={-45} max={45} step={0.1} size="small" />
                </Box>

                <Divider />

                {/* Opacity Control */}
                <Box>
                  <Typography variant="body2" fontWeight={600} mb={1}>
                    <OpacityIcon sx={{ fontSize: 16, verticalAlign: "text-bottom", mr: 0.5 }} />
                    Opacity: {Math.round(opacity * 100)}%
                  </Typography>
                  <Slider value={opacity} onChange={(_e, v) => setOpacity(v as number)} min={0} max={1} step={0.01} size="small" />
                </Box>

                <Divider />

                {/* Crop Controls */}
                <Box>
                  <Typography variant="body2" fontWeight={600} mb={1}>
                    <Crop sx={{ fontSize: 16, verticalAlign: "text-bottom", mr: 0.5 }} />
                    Crop Edges (Remove Film Artifacts)
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Top: {cropTop}%</Typography>
                      <Slider value={cropTop} onChange={(_e, v) => setCropTop(v as number)} min={0} max={20} step={0.1} size="small" />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Bottom: {cropBottom}%</Typography>
                      <Slider value={cropBottom} onChange={(_e, v) => setCropBottom(v as number)} min={0} max={20} step={0.1} size="small" />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Left: {cropLeft}%</Typography>
                      <Slider value={cropLeft} onChange={(_e, v) => setCropLeft(v as number)} min={0} max={20} step={0.1} size="small" />
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Right: {cropRight}%</Typography>
                      <Slider value={cropRight} onChange={(_e, v) => setCropRight(v as number)} min={0} max={20} step={0.1} size="small" />
                    </Box>
                  </Stack>
                </Box>

                {/* Reset Button */}
                <Button
                  variant="outlined"
                  startIcon={<RestartAlt />}
                  onClick={resetAdjustments}
                  fullWidth
                >
                  Reset All Adjustments
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
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

          {/* Satellite imagery (background) */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 1,
              pointerEvents: "none",
              backgroundColor: "rgba(15,23,42,0.95)",
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
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: nowImageLoaded ? 1 : 0,
                  transition: "opacity 0.3s ease-in-out",
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

          {/* Historical photo (foreground with slider) - with cropping wrapper */}
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              pointerEvents: "none",
              clipPath: `inset(${cropTop}% ${cropRight}% ${cropBottom}% ${cropLeft}%)`,
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
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                pointerEvents: "none",
                clipPath: `polygon(0 0, ${sliderValue}% 0, ${sliderValue}% 100%, 0 100%)`,
                opacity: imageLoaded ? opacity : 0,
                transition: "opacity 0.3s ease-in-out",
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale}) rotate(${rotation}deg)`,
                transformOrigin: "center center",
              }}
            />
          </Box>

          {/* Date overlays - Tailwind classes */}
          {imageLoaded && nowImageLoaded && !nowImageError && (
            <Fade in timeout={500}>
              <Box>
                <Box
                  className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10"
                  sx={{
                    backdropFilter: "blur(4px)",
                  }}
                >
                  THEN ({photo.dateFormatted || "Unknown"})
                </Box>
                <Box
                  className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded z-10"
                  sx={{
                    backdropFilter: "blur(4px)",
                  }}
                >
                  NOW (Satellite)
                </Box>
              </Box>
            </Fade>
          )}

          {/* Slider handle - 40px minimum touch target */}
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
            className="absolute top-0 bottom-0 cursor-ew-resize touch-none z-10"
            sx={{
              left: `calc(${sliderValue}% - 2px)`,
              width: 4,
              bgcolor: "primary.main",
              boxShadow: "0 0 16px rgba(16, 185, 129, 0.8)",
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
                minWidth: 40,
                minHeight: 40,
                borderRadius: "50%",
                border: "3px solid currentColor",
                backgroundColor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(0,0,0,0.6)"
                    : "rgba(255,255,255,0.9)",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
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
        
        {/* Mobile: Controls below image */}
        <Box sx={{ display: { xs: "block", md: "none" }, mt: 1.5, mx: 2 }}>
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
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic", display: "block", textAlign: "center", mt: 2 }}
          >
            Use arrow keys (←/→) to adjust slider. Current imagery sourced from Esri World Imagery.
          </Typography>
        </Box>

        {/* Mobile: Adjustment Controls - Reduced spacing for better visibility */}
        <Box className="mt-2" sx={{ display: { xs: "block", md: "none" } }}>
          <Accordion 
            className="rounded-xl"
            sx={{ 
              borderRadius: 2,
              '&:before': {
                display: 'none',
              },
            }} 
            elevation={1}
          >
          <AccordionSummary 
            expandIcon={<ExpandMore />}
            className="px-3 py-2"
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Tune />
              <Typography variant="subtitle2" className="font-semibold">
                Fine-Tune Alignment
              </Typography>
              <Chip label="Advanced" size="small" color="primary" variant="outlined" />
            </Stack>
          </AccordionSummary>
          <AccordionDetails className="px-3 py-2">
            <Stack spacing={3}>
              <Alert severity="info" icon={<Info />}>
                Adjust the historical photo to better align with the satellite imagery. Use these controls to compensate for perspective differences and remove film artifacts.
              </Alert>

              {/* Position Controls */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" fontWeight={600}>Position</Typography>
                  <ButtonGroup size="small" variant="outlined">
                    <Button onClick={() => setOffsetY(offsetY - 5)} title="Move Up"><ArrowUpward fontSize="small" /></Button>
                    <Button onClick={() => setOffsetY(offsetY + 5)} title="Move Down"><ArrowDownward fontSize="small" /></Button>
                    <Button onClick={() => setOffsetX(offsetX - 5)} title="Move Left"><ArrowBack fontSize="small" /></Button>
                    <Button onClick={() => setOffsetX(offsetX + 5)} title="Move Right"><ArrowForward fontSize="small" /></Button>
                  </ButtonGroup>
                </Stack>
                <Stack direction="row" spacing={2}>
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary">X: {offsetX}px</Typography>
                    <Slider value={offsetX} onChange={(_e, v) => setOffsetX(v as number)} min={-200} max={200} step={1} size="small" />
                  </Box>
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary">Y: {offsetY}px</Typography>
                    <Slider value={offsetY} onChange={(_e, v) => setOffsetY(v as number)} min={-200} max={200} step={1} size="small" />
                  </Box>
                </Stack>
              </Box>

              <Divider />

              {/* Scale Control */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" fontWeight={600}>Scale: {scale.toFixed(2)}x</Typography>
                  <ButtonGroup size="small" variant="outlined">
                    <Button onClick={() => setScale(Math.max(0.5, scale - 0.05))} title="Zoom Out"><ZoomOut fontSize="small" /></Button>
                    <Button onClick={() => setScale(Math.min(2, scale + 0.05))} title="Zoom In"><ZoomIn fontSize="small" /></Button>
                  </ButtonGroup>
                </Stack>
                <Slider value={scale} onChange={(_e, v) => setScale(v as number)} min={0.5} max={2} step={0.01} size="small" />
              </Box>

              <Divider />

              {/* Rotation Control */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2" fontWeight={600}>Rotation: {rotation}°</Typography>
                  <ButtonGroup size="small" variant="outlined">
                    <Button onClick={() => setRotation(rotation - 1)} title="Rotate Left"><RotateLeft fontSize="small" /></Button>
                    <Button onClick={() => setRotation(rotation + 1)} title="Rotate Right"><RotateRight fontSize="small" /></Button>
                  </ButtonGroup>
                </Stack>
                <Slider value={rotation} onChange={(_e, v) => setRotation(v as number)} min={-45} max={45} step={0.1} size="small" />
              </Box>

              <Divider />

              {/* Opacity Control */}
              <Box>
                <Typography variant="body2" fontWeight={600} mb={1}>
                  <OpacityIcon sx={{ fontSize: 16, verticalAlign: "text-bottom", mr: 0.5 }} />
                  Opacity: {Math.round(opacity * 100)}%
                </Typography>
                <Slider value={opacity} onChange={(_e, v) => setOpacity(v as number)} min={0} max={1} step={0.01} size="small" />
              </Box>

              <Divider />

              {/* Crop Controls */}
              <Box>
                <Typography variant="body2" fontWeight={600} mb={1}>
                  <Crop sx={{ fontSize: 16, verticalAlign: "text-bottom", mr: 0.5 }} />
                  Crop Edges (Remove Film Artifacts)
                </Typography>
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Top: {cropTop}%</Typography>
                    <Slider value={cropTop} onChange={(_e, v) => setCropTop(v as number)} min={0} max={20} step={0.1} size="small" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Bottom: {cropBottom}%</Typography>
                    <Slider value={cropBottom} onChange={(_e, v) => setCropBottom(v as number)} min={0} max={20} step={0.1} size="small" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Left: {cropLeft}%</Typography>
                    <Slider value={cropLeft} onChange={(_e, v) => setCropLeft(v as number)} min={0} max={20} step={0.1} size="small" />
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Right: {cropRight}%</Typography>
                    <Slider value={cropRight} onChange={(_e, v) => setCropRight(v as number)} min={0} max={20} step={0.1} size="small" />
                  </Box>
                </Stack>
              </Box>

              {/* Reset Button */}
              <Button
                variant="outlined"
                startIcon={<RestartAlt />}
                onClick={resetAdjustments}
                fullWidth
              >
                Reset All Adjustments
              </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
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
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      className="rounded-xl"
      PaperProps={{
        sx: { borderRadius: { xs: 0, sm: '12px' }, minHeight: "80vh" },
      }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pr: 1 }}>
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" fontWeight={700}>
              Then vs Now
            </Typography>
            <Tooltip
              title={
                <Box sx={{ p: 0.5 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Note on alignment:</strong>
                  </Typography>
                  <Typography variant="caption" component="div">
                    The historical photo and current satellite imagery may not align perfectly because:
                  </Typography>
                  <Typography variant="caption" component="ul" sx={{ mt: 0.5, pl: 2 }}>
                    <li>Historical photos used different projection systems</li>
                    <li>Camera angles and perspectives vary</li>
                    <li>Terrain changes over time affect georeferencing</li>
                    <li>Modern satellite imagery uses different capture methods</li>
                  </Typography>
                  <Typography variant="caption" sx={{ mt: 1, display: "block", fontStyle: "italic" }}>
                    Use this feature to compare general area changes rather than precise measurements.
                  </Typography>
                </Box>
              }
              arrow
              placement="bottom-start"
            >
              <InfoOutlined sx={{ fontSize: 20, color: "text.secondary", cursor: "help" }} />
            </Tooltip>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Compare historical aerial photography with current satellite imagery
          </Typography>
        </Stack>
        <IconButton onClick={onClose} aria-label="Close Then vs Now modal">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 2, pb: { xs: 2, md: 1 }, px: { xs: 2, md: 3 } }}>
        {photo && (
          <Box
            className="mb-4 rounded-lg p-1"
            sx={{
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
            }}
          >
            <Tabs
              value={tab}
              onChange={(_e, value) => setTab(value)}
              variant="scrollable"
              allowScrollButtonsMobile
              className="min-h-0"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 40,
                  padding: '8px 16px',
                  textTransform: 'none',
                  fontWeight: 600,
                },
              }}
            >
              <Tab label="Side-by-Side" value="side-by-side" />
              <Tab label="Slider Comparison" value="slider" />
            </Tabs>
          </Box>
        )}
        {renderContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {photo && photo.DOWNLOAD_LINK ? (
          <Button
            variant="contained"
            component="a"
            href={photo.DOWNLOAD_LINK}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download Original TIFF
          </Button>
        ) : (
          <Button variant="contained" disabled>
            Download Original TIFF
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

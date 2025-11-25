import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  IconButton,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  Close,
  ChevronLeft,
  ChevronRight,
  Place,
  CalendarToday,
  PhotoSizeSelectActual,
  Image as ImageIcon,
  Download,
  Fullscreen,
  ZoomIn,
  ZoomOut,
  FitScreen,
} from "@mui/icons-material";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return "https://tas-aerial-browser.awhobbs.workers.dev";
};

interface PhotoViewerProps {
  photo: EnhancedPhoto | null;
  photos?: EnhancedPhoto[]; // Optional array for gallery navigation
  open: boolean;
  onClose: () => void;
  initialIndex?: number; // For gallery mode
}

const LAYER_TYPE_LABELS: Record<string, string> = {
  aerial: "AERIAL",
  ortho: "ORTHO",
  digital: "DIGITAL",
};

export default function PhotoViewer({
  photo,
  photos,
  open,
  onClose,
  initialIndex = 0,
}: PhotoViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [convertedImageUrl, setConvertedImageUrl] = useState<string | null>(null);
  const [useConvertedImage, setUseConvertedImage] = useState(false);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [pinchStart, setPinchStart] = useState<{ distance: number; center: { x: number; y: number } } | null>(null);
  const [lastZoomLevel, setLastZoomLevel] = useState(1);
  
  // Refs to track latest values for use in event handlers (avoid stale closures)
  const zoomLevelRef = useRef(zoomLevel);
  const panPositionRef = useRef(panPosition);
  
  // Keep refs in sync with state
  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);
  
  useEffect(() => {
    panPositionRef.current = panPosition;
  }, [panPosition]);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Determine if we're in gallery mode (multiple photos) or single photo mode
  const isGalleryMode = photos && photos.length > 1;
  const photoList = isGalleryMode ? photos : photo ? [photo] : [];
  const currentPhoto = photoList[currentIndex] || photo;

  const thumbnailUrl = currentPhoto
    ? apiClient.getThumbnailUrl(currentPhoto.IMAGE_NAME, currentPhoto.layerId)
    : "";
  const displayImageUrl = useConvertedImage && convertedImageUrl ? convertedImageUrl : thumbnailUrl;
  const [convertedImageLoaded, setConvertedImageLoaded] = useState(false);

  // Auto-convert function
  const handleAutoConvert = useCallback(async () => {
    if (!currentPhoto?.DOWNLOAD_LINK) {
      console.log('No DOWNLOAD_LINK available for conversion');
      return;
    }

    console.log('Starting conversion for:', currentPhoto.IMAGE_NAME);
    setConverting(true);
    setConversionProgress(0);
    setConversionError(null);
    setConvertedImageLoaded(false);

    try {
      // Use the new TIFF conversion service via API client
      const result = await apiClient.convertTiffFromUrl(
        currentPhoto.DOWNLOAD_LINK,
        (progress) => setConversionProgress(progress)
      );

      console.log('Conversion result:', result);

      // Fetch the converted image from the result URL
      const imageResponse = await fetch(result.url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download converted image: ${imageResponse.statusText}`);
      }

      const webpBlob = await imageResponse.blob();
      const url = URL.createObjectURL(webpBlob);
      
      console.log('Converted image ready, preparing to switch');
      setConvertedImageUrl(url);
      // Don't switch to converted image until it's loaded - keep showing thumbnail
      // The image will preload and then we'll switch once onLoad fires
      setConversionProgress(100);
    } catch (error) {
      console.error("Conversion error:", error);
      setConversionError(error instanceof Error ? error.message : "Conversion failed");
      // Fallback to thumbnail - don't set useConvertedImage to true
      setUseConvertedImage(false);
      setConvertedImageLoaded(false);
    } finally {
      setConverting(false);
    }
  }, [currentPhoto?.DOWNLOAD_LINK, currentPhoto?.IMAGE_NAME]);

  // Reset loading state when changing photos
  useEffect(() => {
    // Only reset if we're actually changing to a different photo
    setImageLoaded(false);
    setUseConvertedImage(false);
    setConvertedImageLoaded(false);
    // Clear previous converted image
    setConvertedImageUrl((prev) => {
      if (prev && prev.startsWith('blob:')) {
        URL.revokeObjectURL(prev);
      }
      return null;
    });
    setConversionError(null);
    setConverting(false);
    setConversionProgress(0);
  }, [currentIndex, currentPhoto?.IMAGE_NAME]);

  // Automatically convert when modal opens or photo changes
  useEffect(() => {
    if (!open || !currentPhoto?.DOWNLOAD_LINK) {
      console.log('Not converting - missing requirements:', { open, hasDownloadLink: !!currentPhoto?.DOWNLOAD_LINK });
      return;
    }

    // Check if we should convert
    if (converting) {
      console.log('Conversion already in progress, skipping');
      return;
    }

    if (convertedImageUrl) {
      console.log('Converted image already exists, skipping conversion');
      return;
    }

    // Start conversion
    console.log('Starting auto-conversion for:', currentPhoto.IMAGE_NAME, 'DOWNLOAD_LINK:', currentPhoto.DOWNLOAD_LINK);
    handleAutoConvert();
  }, [open, currentPhoto?.DOWNLOAD_LINK, currentPhoto?.IMAGE_NAME, currentIndex, handleAutoConvert, converting, convertedImageUrl]);

  // Switch to converted image once it's loaded
  useEffect(() => {
    if (convertedImageUrl && convertedImageLoaded && !useConvertedImage) {
      console.log('Converted image loaded, switching to it');
      setUseConvertedImage(true);
      setImageLoaded(true);
    }
  }, [convertedImageUrl, convertedImageLoaded, useConvertedImage]);

  // Reset image loaded state when thumbnail URL changes (but not when switching to converted)
  useEffect(() => {
    // Only reset if we're not switching to a converted image
    if (!useConvertedImage) {
      setImageLoaded(false);
    }
  }, [thumbnailUrl]);

  // Update initial index when prop changes
  useEffect(() => {
    if (isGalleryMode && initialIndex !== undefined) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex, isGalleryMode]);

  const handleNext = useCallback(() => {
    if (isGalleryMode && currentIndex < photoList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, isGalleryMode, photoList.length]);

  const handlePrevious = useCallback(() => {
    if (isGalleryMode && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex, isGalleryMode]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case "ArrowLeft":
          if (isGalleryMode) {
            handlePrevious();
          }
          break;
        case "ArrowRight":
          if (isGalleryMode) {
            handleNext();
          }
          break;
        case "Escape":
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleNext, handlePrevious, onClose, isGalleryMode]);

  const handleClose = () => {
    setImageLoaded(false);
    setCurrentIndex(0);
    setConverting(false);
    setConversionProgress(0);
    setConversionError(null);
    setUseConvertedImage(false);
    setFullScreenOpen(false);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
    if (convertedImageUrl) {
      // Don't revoke if it's a URL from the proxy (not a blob URL)
      if (convertedImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(convertedImageUrl);
      }
      setConvertedImageUrl(null);
    }
    onClose();
  };

  const handleFullScreen = () => {
    setFullScreenOpen(true);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.1));
  };

  const handleResetZoom = () => {
    // Reset to 100% zoom and center position
    // Use requestAnimationFrame to avoid issues on mobile
    requestAnimationFrame(() => {
      setZoomLevel(1);
      setPanPosition({ x: 0, y: 0 });
    });
  };

  const handleFitToScreen = () => {
    // Calculate zoom to fit image to screen
    if (imageDimensions) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scaleX = viewportWidth / imageDimensions.width;
      const scaleY = viewportHeight / imageDimensions.height;
      const fitZoom = Math.min(scaleX, scaleY) * 0.95; // 95% to add some padding
      setZoomLevel(Math.max(0.1, Math.min(fitZoom, 5))); // Clamp between 0.1 and 5
    } else {
      // Fallback if dimensions not available
      setZoomLevel(0.5);
    }
    setPanPosition({ x: 0, y: 0 });
  };


  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow panning at any zoom level, but only if clicking on the image area
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Calculate distance between two touches
  const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    const dx = touch2.clientX - touch1.clientX;
    const dy = touch2.clientY - touch1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Calculate center point between two touches
  const getTouchCenter = (touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  // Touch event handlers for mobile panning and pinch-to-zoom
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch - start panning
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - panPosition.x, y: touch.clientY - panPosition.y });
      setPinchStart(null);
    } else if (e.touches.length === 2) {
      // Two touches - start pinch-to-zoom
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      // Guard against division by zero: if touches are at the same location, use minimum distance
      const minDistance = 1; // Minimum 1px to prevent division by zero
      const safeDistance = Math.max(distance, minDistance);
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      setPinchStart({ distance: safeDistance, center });
      setLastZoomLevel(zoomLevel);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      // Single touch - continue panning
      e.preventDefault();
      e.stopPropagation();
      const touch = e.touches[0];
      setPanPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    } else if (e.touches.length === 2 && pinchStart) {
      // Two touches - pinch-to-zoom
      e.preventDefault();
      e.stopPropagation();
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      // Guard against division by zero: ensure pinchStart.distance is never 0
      if (pinchStart.distance === 0) {
        return; // Skip this update if initial distance was invalid
      }
      const scale = distance / pinchStart.distance;
      const newZoom = Math.max(0.5, Math.min(5, lastZoomLevel * scale));
      
      // Get container bounds to convert touch coordinates correctly
      const containerRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const center = getTouchCenter(e.touches[0], e.touches[1]);
      
      // Convert pinch center to container-relative coordinates (like wheel handler)
      const centerX = center.x - containerRect.left - containerRect.width / 2;
      const centerY = center.y - containerRect.top - containerRect.height / 2;
      
      // Calculate the point on the image that the pinch center is over
      // Use lastZoomLevel (the zoom at pinch start) for consistency with newZoom calculation
      // This ensures the coordinate transformation matches the zoom scaling
      const imageX = (centerX - panPosition.x) / lastZoomLevel;
      const imageY = (centerY - panPosition.y) / lastZoomLevel;
      
      // Adjust pan position so the same point on the image stays under the pinch center
      const newPanX = centerX - imageX * newZoom;
      const newPanY = centerY - imageY * newZoom;
      
      setZoomLevel(newZoom);
      setPanPosition({ x: newPanX, y: newPanY });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setPinchStart(null);
    if (e.touches.length === 1) {
      // One touch remaining - switch to panning
      // Use ref to get current panPosition (avoids stale closure value)
      const touch = e.touches[0];
      const currentPan = panPositionRef.current;
      setDragStart({ x: touch.clientX - currentPan.x, y: touch.clientY - currentPan.y });
      setIsDragging(true);
      setPinchStart(null);
    }
    // Note: lastZoomLevel is already set correctly in handleTouchStart when a new pinch begins
    // No need to update it here as zoomLevel would be stale from closure
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (fullScreenOpen) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      
      // Use refs to get current values (avoids stale closures during rapid wheel events)
      const currentZoom = zoomLevelRef.current;
      const currentPan = panPositionRef.current;
      
      // Get mouse position relative to the container center
      const containerRect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left - containerRect.width / 2;
      const mouseY = e.clientY - containerRect.top - containerRect.height / 2;
      
      // Calculate the point on the image that the mouse is over
      // This accounts for current pan and zoom
      const imageX = (mouseX - currentPan.x) / currentZoom;
      const imageY = (mouseY - currentPan.y) / currentZoom;
      
      // Calculate new zoom level
      const newZoom = Math.max(0.5, Math.min(5, currentZoom + delta));
      
      // Adjust pan position so the same point on the image stays under the mouse
      const newPanX = mouseX - imageX * newZoom;
      const newPanY = mouseY - imageY * newZoom;
      
      setZoomLevel(newZoom);
      setPanPosition({ x: newPanX, y: newPanY });
    }
  };

  if (!currentPhoto) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={isGalleryMode ? "lg" : "md"}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 3 },
          maxHeight: { xs: "100vh", sm: "95vh" },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ImageIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 500 }}>
            {isGalleryMode ? "Photo Gallery" : "Photo Preview"}
          </Typography>
          {isGalleryMode && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
              {currentIndex + 1} / {photoList.length}
            </Typography>
          )}
        </Box>
        <IconButton onClick={handleClose} size="small" aria-label="Close modal">
          <Close />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {/* Image Preview with conversion status */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            minHeight: 400,
            bgcolor: "background.default",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          {/* Conversion progress overlay - moved to bottom */}
          {converting && (
            <Box
              sx={{
                position: "absolute",
                bottom: 16,
                left: 16,
                right: 16,
                zIndex: 2,
                bgcolor: "background.paper",
                borderRadius: 1,
                p: 1.5,
                boxShadow: 2,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                <CircularProgress size={16} />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  Converting to WEBP... {conversionProgress}%
                </Typography>
              </Stack>
              <LinearProgress variant="determinate" value={conversionProgress} sx={{ height: 4, borderRadius: 2 }} />
            </Box>
          )}

          {/* Full screen button - only enable when converted image is loaded */}
          {imageLoaded && (
            <Tooltip title={convertedImageLoaded && useConvertedImage ? "Full screen" : "Waiting for high-quality image..."}>
              <span>
                <IconButton
                  onClick={handleFullScreen}
                  disabled={!convertedImageLoaded || !useConvertedImage}
                  sx={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    zIndex: 2,
                    bgcolor: "background.paper",
                    boxShadow: 2,
                    "&:hover": {
                      bgcolor: "background.paper",
                      transform: "scale(1.1)",
                    },
                    "&:disabled": {
                      opacity: 0.5,
                    },
                  }}
                  size="medium"
                >
                  <Fullscreen />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {/* Navigation buttons - only show in gallery mode */}
          {isGalleryMode && (
            <>
              <IconButton
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                sx={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)",
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.1)",
                  },
                  "&.Mui-disabled": {
                    opacity: 0.3,
                  },
                }}
                size="large"
              >
                <ChevronLeft sx={{ fontSize: 32 }} />
              </IconButton>

              <IconButton
                onClick={handleNext}
                disabled={currentIndex === photoList.length - 1}
                sx={{
                  position: "absolute",
                  right: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 2,
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.1)"
                      : "rgba(0, 0, 0, 0.05)",
                  "&:hover": {
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.2)"
                        : "rgba(0, 0, 0, 0.1)",
                  },
                  "&.Mui-disabled": {
                    opacity: 0.3,
                  },
                }}
                size="large"
              >
                <ChevronRight sx={{ fontSize: 32 }} />
              </IconButton>
            </>
          )}

          {!imageLoaded && (
            <CircularProgress
              size={60}
              sx={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          )}
          {/* Thumbnail image - always shown initially */}
          <img
            key={`thumbnail-${thumbnailUrl}`}
            src={thumbnailUrl}
            alt={currentPhoto.IMAGE_NAME}
            onLoad={() => {
              if (!useConvertedImage) {
                setImageLoaded(true);
              }
            }}
            style={{
              maxWidth: "100%",
              maxHeight: isMobile ? "50vh" : "60vh",
              objectFit: "contain",
              display: useConvertedImage ? "none" : (imageLoaded ? "block" : "none"),
            }}
          />
          {/* Converted image - preload and show when ready */}
          {convertedImageUrl && (
            <img
              key={`converted-${convertedImageUrl}`}
              src={convertedImageUrl}
              alt={`${currentPhoto.IMAGE_NAME} (converted)`}
              onLoad={() => {
                console.log('Converted image loaded successfully');
                setConvertedImageLoaded(true);
              }}
              onError={() => {
                console.error('Converted image failed to load, falling back to thumbnail');
                setUseConvertedImage(false);
                setConvertedImageLoaded(false);
                setImageLoaded(true); // Ensure thumbnail is shown
              }}
              style={{
                maxWidth: "100%",
                maxHeight: isMobile ? "50vh" : "60vh",
                objectFit: "contain",
                display: useConvertedImage && convertedImageLoaded ? "block" : "none",
              }}
            />
          )}
        </Box>

        {/* Photo metadata */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={1.5}>
            {/* Header with chips */}
            <Box>
              <Box sx={{ display: "flex", gap: 0.75, mb: 1.5, flexWrap: "wrap" }}>
                <Chip
                  label={LAYER_TYPE_LABELS[currentPhoto.layerType]}
                  color={
                    currentPhoto.layerType === "aerial"
                      ? "info"
                      : currentPhoto.layerType === "ortho"
                      ? "success"
                      : "warning"
                  }
                  size="small"
                  sx={{ fontSize: "0.7rem", height: 22, fontWeight: 500 }}
                />
                {currentPhoto.cached && (
                  <Chip
                    label="Cached"
                    color="success"
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: "0.7rem", height: 22, fontWeight: 500 }}
                  />
                )}
              </Box>
              <Typography variant="h6" gutterBottom sx={{ fontSize: "0.9375rem", fontWeight: 500 }}>
                {currentPhoto.dateFormatted || "Unknown Date"}
              </Typography>
            </Box>

            <Divider />

            {/* Details grid */}
            <Stack spacing={1.5}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CalendarToday sx={{ fontSize: 20, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  Date:
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {currentPhoto.dateFormatted || "Unknown"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PhotoSizeSelectActual
                  sx={{ fontSize: 20, color: "text.secondary" }}
                />
                <Typography variant="body2" color="text.secondary">
                  Scale:
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {currentPhoto.scaleFormatted || "N/A"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ImageIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  File:
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={500}
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {currentPhoto.IMAGE_NAME}
                </Typography>
              </Box>

              {currentPhoto.geometry && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Place sx={{ fontSize: 20, color: "text.secondary" }} />
                  <Typography variant="body2" color="text.secondary">
                    Location:
                  </Typography>
                  <Typography variant="body2" fontWeight={500}>
                    Available on map
                  </Typography>
                </Box>
              )}
            </Stack>

          </Stack>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1, justifyContent: "flex-end", borderTop: 1, borderColor: "divider" }}>
        {/* Error message (only show if conversion failed and we're using thumbnail) */}
        {conversionError && !useConvertedImage && (
          <Box sx={{ width: '100%', mb: 1, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="caption" color="warning.dark" sx={{ fontSize: '0.75rem' }}>
              Using thumbnail (conversion failed: {conversionError})
            </Typography>
          </Box>
        )}

        {/* Action buttons */}
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: "100%" }}>
          <Button onClick={handleClose} color="inherit" size="medium" sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
            Close
          </Button>
          {currentPhoto.DOWNLOAD_LINK && (
            <Button
              variant="contained"
              component="a"
              href={currentPhoto.DOWNLOAD_LINK}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<Download />}
              size="medium"
              sx={{ fontSize: "0.875rem", fontWeight: 500 }}
            >
              Download TIFF
            </Button>
          )}
        </Stack>
      </DialogActions>

      {/* Full Screen Zoom Dialog */}
      <Dialog
        open={fullScreenOpen}
        onClose={() => setFullScreenOpen(false)}
        maxWidth={false}
        fullWidth
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: "rgba(0, 0, 0, 0.95)",
            m: 0,
            borderRadius: 0,
          },
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100vw",
            height: "100vh",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "none", // Handle all touch gestures manually for full control
            userSelect: "none", // Prevent text selection
            WebkitUserSelect: "none", // iOS Safari
            WebkitTouchCallout: "none", // iOS Safari - prevent callout menu
            // Prevent text selection on all children
            "& *": {
              userSelect: "none",
              WebkitUserSelect: "none",
            },
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onWheel={handleWheel}
        >
          {/* Zoom controls */}
          <Box
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 3,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              // Prevent touch events from interfering with button clicks
              touchAction: "auto",
              pointerEvents: "auto",
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          >
            <Tooltip title="Zoom in">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomIn();
                }}
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <ZoomIn />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom out">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleZoomOut();
                }}
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Tooltip title="Fit to screen">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleFitToScreen();
                }}
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <FitScreen />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset zoom">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetZoom();
                }}
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <ZoomOut />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  setFullScreenOpen(false);
                }}
                sx={{
                  bgcolor: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255, 255, 255, 0.2)" },
                }}
              >
                <Close />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Zoom level indicator */}
          <Box
            sx={{
              position: "absolute",
              top: 16,
              left: 16,
              zIndex: 3,
              bgcolor: "rgba(0, 0, 0, 0.5)",
              color: "white",
              px: 2,
              py: 1,
              borderRadius: 1,
            }}
          >
            <Typography variant="caption">
              {Math.round(zoomLevel * 100)}%
            </Typography>
          </Box>

          {/* Pan controls - removed in favor of natural drag behavior */}

          {/* Zoomed image */}
          <img
            key={useConvertedImage && convertedImageUrl ? convertedImageUrl : thumbnailUrl} // Force re-render when URL changes
            src={useConvertedImage && convertedImageUrl ? convertedImageUrl : thumbnailUrl}
            alt={currentPhoto.IMAGE_NAME}
            onLoad={(e) => {
              const img = e.currentTarget;
              setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
            }}
            onDragStart={(e) => e.preventDefault()} // Prevent native drag
            onContextMenu={(e) => e.preventDefault()} // Prevent context menu on long press
            style={{
              maxWidth: "none",
              maxHeight: "none",
              width: "auto",
              height: "auto",
              transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${zoomLevel})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.1s ease-out",
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: "none",
              WebkitUserSelect: "none",
              WebkitTouchCallout: "none",
              pointerEvents: "auto",
            }}
            draggable={false}
          />
        </Box>
      </Dialog>
    </Dialog>
  );
}


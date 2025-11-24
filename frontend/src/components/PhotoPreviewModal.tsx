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
  Place,
  CalendarToday,
  PhotoSizeSelectActual,
  Image as ImageIcon,
  Download,
  Fullscreen,
  ZoomIn,
  ZoomOut,
  FitScreen,
  History,
} from "@mui/icons-material";
import { useState, useEffect, useRef } from "react";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";
import ThenNowModal from "./ThenNowModal";

interface PhotoPreviewModalProps {
  photo: EnhancedPhoto | null;
  open: boolean;
  onClose: () => void;
}

const LAYER_TYPE_LABELS: Record<string, string> = {
  aerial: "AERIAL",
  ortho: "ORTHO",
  digital: "DIGITAL",
};

export default function PhotoPreviewModal({ photo, open, onClose }: PhotoPreviewModalProps) {
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
  const [pinchStart, setPinchStart] = useState<{ distance: number; center: { x: number; y: number } } | null>(null);
  const [lastZoomLevel, setLastZoomLevel] = useState(1);
  const [thenNowModalOpen, setThenNowModalOpen] = useState(false);
  
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

  if (!photo) return null;

  const thumbnailUrl = apiClient.getThumbnailUrl(photo.IMAGE_NAME, photo.layerId);
  const displayImageUrl = useConvertedImage && convertedImageUrl ? convertedImageUrl : thumbnailUrl;

  // Automatically convert when modal opens
  useEffect(() => {
    if (open && photo?.DOWNLOAD_LINK && !convertedImageUrl && !converting) {
      handleAutoConvert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, photo?.DOWNLOAD_LINK]);

  // Reset image loaded state when image URL changes
  useEffect(() => {
    setImageLoaded(false);
  }, [displayImageUrl]);

  // Reset state when modal closes
  const handleClose = () => {
    setImageLoaded(false);
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

  const handleAutoConvert = async () => {
    if (!photo?.DOWNLOAD_LINK) {
      return;
    }

    setConverting(true);
    setConversionProgress(0);
    setConversionError(null);

    try {
      // Use the new TIFF conversion service via API client
      const result = await apiClient.convertTiffFromUrl(
        photo.DOWNLOAD_LINK,
        (progress) => setConversionProgress(progress)
      );

      // Fetch the converted image from the result URL
      const imageResponse = await fetch(result.url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download converted image: ${imageResponse.statusText}`);
      }

      const webpBlob = await imageResponse.blob();
      const url = URL.createObjectURL(webpBlob);
      
      setConvertedImageUrl(url);
      setUseConvertedImage(true);
      setConversionProgress(100);
    } catch (error) {
      console.error("Conversion error:", error);
      setConversionError(error instanceof Error ? error.message : "Conversion failed");
      // Fallback to thumbnail - don't set useConvertedImage to true
      setUseConvertedImage(false);
    } finally {
      setConverting(false);
    }
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
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow panning at any zoom level
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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: { xs: 0, sm: 3 },
          maxHeight: { xs: "100vh", sm: "90vh" },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1.5,
          pt: 2.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ImageIcon color="primary" sx={{ fontSize: 20 }} />
          <Typography variant="h6" component="span" sx={{ fontSize: "1rem", fontWeight: 500 }}>
            Photo Preview
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          aria-label="Close modal"
          sx={{
            color: "text.secondary",
            "&:hover": { color: "text.primary" },
          }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: 0 }}>
        {/* Image preview with conversion status */}
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
          {/* Conversion progress overlay */}
          {converting && (
            <Box
              sx={{
                position: "absolute",
                top: 16,
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

          {/* Full screen button */}
          {imageLoaded && (
            <Tooltip title="Full screen">
              <IconButton
                onClick={handleFullScreen}
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
                }}
                size="medium"
              >
                <Fullscreen />
              </IconButton>
            </Tooltip>
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
          <img
            key={displayImageUrl} // Force re-render when URL changes
            src={displayImageUrl}
            alt={photo.IMAGE_NAME}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              // If converted image fails to load, fallback to thumbnail
              if (useConvertedImage) {
                setUseConvertedImage(false);
                setImageLoaded(true);
              }
            }}
            style={{
              maxWidth: "100%",
              maxHeight: "60vh",
              objectFit: "contain",
              display: imageLoaded ? "block" : "none",
            }}
          />
        </Box>

        {/* Photo metadata */}
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
          <Stack spacing={1.5}>
            {/* Header with chips */}
            <Box>
              <Box sx={{ display: "flex", gap: 0.75, mb: 1.5, flexWrap: "wrap" }}>
                <Chip
                  label={LAYER_TYPE_LABELS[photo.layerType]}
                  color={
                    photo.layerType === "aerial"
                      ? "info"
                      : photo.layerType === "ortho"
                      ? "success"
                      : "warning"
                  }
                  size="small"
                  sx={{ fontSize: "0.7rem", height: 22, fontWeight: 500 }}
                />
                {photo.cached && (
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
                {photo.dateFormatted || "Unknown Date"}
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
                  {photo.dateFormatted || "Unknown"}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <PhotoSizeSelectActual sx={{ fontSize: 20, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  Scale:
                </Typography>
                <Typography variant="body2" fontWeight={500}>
                  {photo.scaleFormatted || "N/A"}
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
                  {photo.IMAGE_NAME}
                </Typography>
              </Box>

              {photo.geometry && (
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

      <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'flex-end', borderTop: 1, borderColor: 'divider' }}>
        {/* Error message (only show if conversion failed and we're using thumbnail) */}
        {conversionError && !useConvertedImage && (
          <Box sx={{ width: '100%', mb: 1, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="caption" color="warning.dark" sx={{ fontSize: '0.75rem' }}>
              Using thumbnail (conversion failed: {conversionError})
            </Typography>
          </Box>
        )}

        {/* Action buttons */}
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: '100%' }}>
          <Button onClick={handleClose} color="inherit" size="medium" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
            Close
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setThenNowModalOpen(true)}
            startIcon={<History />}
            size="medium"
            sx={{ fontSize: '0.875rem', fontWeight: 500 }}
          >
            Then vs Now
          </Button>
          {photo.DOWNLOAD_LINK && (
            <Button
              variant="contained"
              component="a"
              href={photo.DOWNLOAD_LINK}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<Download />}
              size="medium"
              sx={{ fontSize: '0.875rem', fontWeight: 500 }}
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
                <FitScreen />
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

          {/* Zoomed image */}
          <img
            key={displayImageUrl} // Force re-render when URL changes
            src={displayImageUrl}
            alt={photo.IMAGE_NAME}
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

      {/* Then vs Now Modal */}
      <ThenNowModal
        open={thenNowModalOpen}
        photo={photo}
        onClose={() => setThenNowModalOpen(false)}
      />
    </Dialog>
  );
}

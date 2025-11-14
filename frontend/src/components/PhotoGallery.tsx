import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Chip,
  Stack,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Close,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  FullscreenExit,
  Fullscreen,
  CalendarToday,
  PhotoSizeSelectActual,
} from "@mui/icons-material";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";

interface PhotoGalleryProps {
  photos: EnhancedPhoto[];
  open: boolean;
  onClose: () => void;
  initialIndex?: number;
}

const LAYER_TYPE_LABELS: Record<string, string> = {
  aerial: "AERIAL",
  ortho: "ORTHO",
  digital: "DIGITAL",
};

export default function PhotoGallery({
  photos,
  open,
  onClose,
  initialIndex = 0,
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const currentPhoto = photos[currentIndex];
  const thumbnailUrl = currentPhoto
    ? apiClient.getThumbnailUrl(currentPhoto.IMAGE_NAME, currentPhoto.layerId)
    : "";

  // Reset zoom when changing photos
  useEffect(() => {
    setZoomLevel(1);
    setImageLoaded(false);
  }, [currentIndex]);

  // Update initial index when prop changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case "ArrowLeft":
          handlePrevious();
          break;
        case "ArrowRight":
          handleNext();
          break;
        case "Escape":
          onClose();
          break;
        case "+":
        case "=":
          handleZoomIn();
          break;
        case "-":
          handleZoomOut();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, currentIndex, zoomLevel]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, photos.length]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleZoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (!currentPhoto) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullScreen
      sx={{
        "& .MuiDialog-paper": {
          bgcolor: "rgba(0, 0, 0, 0.95)",
          margin: 0,
          maxHeight: "none",
        },
      }}
    >
      {/* Top toolbar */}
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          p: 2,
          background: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
        }}
      >
        {/* Photo info */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
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
          />
          <Typography variant="body2" color="white" fontWeight={600}>
            {currentPhoto.dateFormatted || "Unknown Date"}
          </Typography>
          <Typography variant="caption" color="rgba(255, 255, 255, 0.7)">
            {currentIndex + 1} / {photos.length}
          </Typography>
        </Box>

        {/* Controls */}
        <Stack direction="row" spacing={1}>
          {!isMobile && (
            <>
              <IconButton
                onClick={handleZoomOut}
                disabled={zoomLevel <= 0.5}
                sx={{ color: "white" }}
                size="small"
              >
                <ZoomOut />
              </IconButton>
              <IconButton
                onClick={handleZoomIn}
                disabled={zoomLevel >= 3}
                sx={{ color: "white" }}
                size="small"
              >
                <ZoomIn />
              </IconButton>
              <IconButton onClick={toggleFullscreen} sx={{ color: "white" }} size="small">
                {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
              </IconButton>
            </>
          )}
          <IconButton onClick={onClose} sx={{ color: "white" }} size="small">
            <Close />
          </IconButton>
        </Stack>
      </Box>

      {/* Main image area */}
      <DialogContent
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 0,
          overflow: "hidden",
          position: "relative",
          height: "100vh",
        }}
      >
        {/* Navigation buttons */}
        <IconButton
          onClick={handlePrevious}
          disabled={currentIndex === 0}
          sx={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            bgcolor: "rgba(0, 0, 0, 0.6)",
            color: "white",
            "&:hover": {
              bgcolor: "rgba(0, 0, 0, 0.8)",
            },
            "&.Mui-disabled": {
              display: "none",
            },
          }}
          size="large"
        >
          <ChevronLeft sx={{ fontSize: 40 }} />
        </IconButton>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            overflow: "auto",
            cursor: zoomLevel > 1 ? "move" : "default",
          }}
        >
          <img
            src={thumbnailUrl}
            alt={currentPhoto.IMAGE_NAME}
            onLoad={() => setImageLoaded(true)}
            style={{
              maxWidth: zoomLevel === 1 ? "90%" : "none",
              maxHeight: zoomLevel === 1 ? "90vh" : "none",
              objectFit: "contain",
              transform: `scale(${zoomLevel})`,
              transformOrigin: "center center",
              transition: "transform 0.2s ease-out",
              display: imageLoaded ? "block" : "none",
            }}
          />
        </Box>

        <IconButton
          onClick={handleNext}
          disabled={currentIndex === photos.length - 1}
          sx={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 1,
            bgcolor: "rgba(0, 0, 0, 0.6)",
            color: "white",
            "&:hover": {
              bgcolor: "rgba(0, 0, 0, 0.8)",
            },
            "&.Mui-disabled": {
              display: "none",
            },
          }}
          size="large"
        >
          <ChevronRight sx={{ fontSize: 40 }} />
        </IconButton>
      </DialogContent>

      {/* Bottom info bar */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1300,
          p: 2,
          background: "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
        }}
      >
        <Stack direction="row" spacing={3} sx={{ color: "white", justifyContent: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CalendarToday sx={{ fontSize: 16, opacity: 0.7 }} />
            <Typography variant="caption">{currentPhoto.dateFormatted || "Unknown"}</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PhotoSizeSelectActual sx={{ fontSize: 16, opacity: 0.7 }} />
            <Typography variant="caption">{currentPhoto.scaleFormatted || "N/A"}</Typography>
          </Box>
          <Typography variant="caption" sx={{ opacity: 0.7, maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentPhoto.IMAGE_NAME}
          </Typography>
        </Stack>
      </Box>
    </Dialog>
  );
}

import { useState, useEffect, useCallback } from "react";
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
  const [webpUrl, setWebpUrl] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Determine if we're in gallery mode (multiple photos) or single photo mode
  const isGalleryMode = photos && photos.length > 1;
  const photoList = isGalleryMode ? photos : photo ? [photo] : [];
  const currentPhoto = photoList[currentIndex] || photo;

  // Reset loading state when changing photos
  useEffect(() => {
    setImageLoaded(false);
  }, [currentIndex, currentPhoto?.IMAGE_NAME]);

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
    if (webpUrl) {
      URL.revokeObjectURL(webpUrl);
      setWebpUrl(null);
    }
    onClose();
  };

  const handleConvertToWebP = async () => {
    if (!currentPhoto?.DOWNLOAD_LINK) {
      setConversionError("No download link available");
      return;
    }

    setConverting(true);
    setConversionProgress(0);
    setConversionError(null);

    try {
      // Use backend proxy endpoint to avoid CORS issues
      setConversionProgress(20);
      const formData = new FormData();
      formData.append("tiffUrl", currentPhoto.DOWNLOAD_LINK);

      const apiBaseUrl = getApiBaseUrl();
      const convertResponse = await fetch(`${apiBaseUrl}/api/convert/webp`, {
        method: "POST",
        body: formData,
      });

      setConversionProgress(70);

      if (!convertResponse.ok) {
        let errorText = "";
        try {
          const errorJson = await convertResponse.json();
          errorText = errorJson.error || errorJson.details || JSON.stringify(errorJson);
        } catch {
          errorText = await convertResponse.text();
        }
        throw new Error(`Conversion failed: ${convertResponse.status} - ${errorText}`);
      }

      setConversionProgress(90);
      
      // Response should be the WEBP blob directly
      const webpBlob = await convertResponse.blob();

      // Step 3: Create download URL
      const url = URL.createObjectURL(webpBlob);
      setWebpUrl(url);
      setConversionProgress(100);

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = currentPhoto.IMAGE_NAME.replace(/\.tif(f)?$/i, ".webp");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up after a delay
      setTimeout(() => {
        URL.revokeObjectURL(url);
        setWebpUrl(null);
        setConversionProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Conversion error:", error);
      setConversionError(error instanceof Error ? error.message : "Conversion failed");
      setConversionProgress(0);
    } finally {
      setConverting(false);
    }
  };

  if (!currentPhoto) return null;

  const thumbnailUrl = apiClient.getThumbnailUrl(
    currentPhoto.IMAGE_NAME,
    currentPhoto.layerId
  );
  const estimatedSize = "~10-30 MB";

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
        {/* Image Preview */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            minHeight: 400,
            bgcolor: "background.default",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
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
          <img
            src={thumbnailUrl}
            alt={currentPhoto.IMAGE_NAME}
            onLoad={() => setImageLoaded(true)}
            style={{
              maxWidth: "100%",
              maxHeight: isMobile ? "50vh" : "60vh",
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

      <DialogActions sx={{ p: 2, gap: 1, justifyContent: "flex-end", borderTop: 1, borderColor: "divider", flexDirection: "column", alignItems: "stretch" }}>
        {/* Progress indicator */}
        {converting && (
          <Box sx={{ width: "100%", mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                Converting to WEBP... {conversionProgress}%
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={conversionProgress} sx={{ height: 4, borderRadius: 2 }} />
          </Box>
        )}

        {/* Error message */}
        {conversionError && (
          <Box sx={{ width: "100%", mb: 1, p: 1, bgcolor: "error.light", borderRadius: 1 }}>
            <Typography variant="caption" color="error" sx={{ fontSize: "0.75rem" }}>
              {conversionError}
            </Typography>
          </Box>
        )}

        {/* Action buttons */}
        <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ width: "100%" }}>
          <Button onClick={handleClose} color="inherit" size="medium" sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
            Close
          </Button>
          <Button
            variant="outlined"
            onClick={handleConvertToWebP}
            disabled={converting || !currentPhoto?.DOWNLOAD_LINK}
            startIcon={converting ? <CircularProgress size={16} /> : <Download />}
            size="medium"
            sx={{ fontSize: "0.875rem", fontWeight: 500 }}
          >
            Convert to WEBP
          </Button>
          {currentPhoto.DOWNLOAD_LINK && (
            <Button
              variant="contained"
              component="a"
              href={currentPhoto.DOWNLOAD_LINK}
              target="_blank"
              rel="noopener noreferrer"
              size="medium"
              sx={{ fontSize: "0.875rem", fontWeight: 500 }}
            >
              Download TIFF
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}


import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  IconButton,
  Button,
  Box,
  Typography,
  Chip,
  Stack,
  useTheme,
  useMediaQuery,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Close,
  ChevronLeft,
  ChevronRight,
  CalendarToday,
  PhotoSizeSelectActual,
  Image as ImageIcon,
  History,
} from "@mui/icons-material";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";
import ThenNowModal from "./ThenNowModal";

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
  const [imageLoaded, setImageLoaded] = useState(false);
  const [thenNowModalOpen, setThenNowModalOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const currentPhoto = photos[currentIndex];
  const thumbnailUrl = currentPhoto
    ? apiClient.getThumbnailUrl(currentPhoto.IMAGE_NAME, currentPhoto.layerId)
    : "";

  // Reset loading state when changing photos
  useEffect(() => {
    setImageLoaded(false);
  }, [currentIndex]);

  // Update initial index when prop changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

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
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleNext, handlePrevious, onClose]);

  if (!currentPhoto) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          maxHeight: "95vh",
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
          <ImageIcon color="primary" />
          <Typography variant="h6">Photo Gallery</Typography>
          <Typography variant="caption" color="text.secondary">
            {currentIndex + 1} / {photos.length}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
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
          {/* Navigation buttons */}
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
                display: "none",
              },
            }}
            size="large"
          >
            <ChevronLeft sx={{ fontSize: 32 }} />
          </IconButton>

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

          <IconButton
            onClick={handleNext}
            disabled={currentIndex === photos.length - 1}
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
                display: "none",
              },
            }}
            size="large"
          >
            <ChevronRight sx={{ fontSize: 32 }} />
          </IconButton>
        </Box>

        {/* Photo metadata */}
        <Box sx={{ p: 3 }}>
          <Stack spacing={2}>
            {/* Header with chips and Then vs Now button */}
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 2,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    gap: 1,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
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
                  {currentPhoto.cached && (
                    <Chip
                      label="Cached"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
                <Button
                  variant="outlined"
                  color="secondary"
                  onClick={() => setThenNowModalOpen(true)}
                  startIcon={<History />}
                  size="small"
                  sx={{ fontSize: "0.75rem", fontWeight: 500, flexShrink: 0 }}
                >
                  Then vs Now
                </Button>
              </Box>
              <Typography variant="h5" gutterBottom fontWeight={600}>
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
            </Stack>

            {/* File size warning with download link */}
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(251, 191, 36, 0.1)"
                    : "rgba(251, 191, 36, 0.1)",
                borderRadius: 2,
                border: (theme) =>
                  theme.palette.mode === "dark"
                    ? "1px solid rgba(251, 191, 36, 0.3)"
                    : "1px solid rgba(251, 191, 36, 0.3)",
              }}
            >
              <Typography
                variant="body2"
                color="warning.dark"
                fontWeight={600}
                sx={{ mb: 1 }}
              >
                Full Resolution TIFF
              </Typography>
              {currentPhoto.DOWNLOAD_LINK ? (
                <>
                  <Box
                    component="a"
                    href={currentPhoto.DOWNLOAD_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: "inline-block",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "primary.main",
                      textDecoration: "none",
                      mb: 0.5,
                      "&:hover": {
                        textDecoration: "underline",
                      },
                    }}
                  >
                    Download Full Resolution TIFF →
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    Original high-resolution TIFF file (~10-30 MB). On iOS:
                    long-press the link to download.
                  </Typography>
                </>
              ) : (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Download not available for this photo.
                </Typography>
              )}
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <Divider />

      {/* Actions */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        <IconButton onClick={onClose} size="small" color="inherit">
          <Close />
        </IconButton>
      </Box>

      {/* Then vs Now Modal */}
      <ThenNowModal
        open={thenNowModalOpen}
        photo={currentPhoto}
        onClose={() => setThenNowModalOpen(false)}
      />
    </Dialog>
  );
}

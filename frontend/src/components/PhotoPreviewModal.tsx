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
  History,
} from "@mui/icons-material";
import { useState, useEffect } from "react";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";
import ThenNowModal from "./ThenNowModal";
import { useTiffConversion } from "../hooks/useTiffConversion";
import OpenSeadragonViewer from "./OpenSeadragonViewer";

// Auto-deployment test: This commit triggers Worker and Pages deployments

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

export default function PhotoPreviewModal({
  photo,
  open,
  onClose,
}: PhotoPreviewModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [thenNowModalOpen, setThenNowModalOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Use the new TIFF conversion hook
  const {
    converting,
    progress: conversionProgress,
    error: conversionError,
    convertedImageUrl,
    imageWidth,
    imageHeight,
    convertTiff,
    cleanup,
  } = useTiffConversion();

  const thumbnailUrl = photo
    ? apiClient.getThumbnailUrl(photo.IMAGE_NAME, photo.layerId)
    : "";
  const displayImageUrl = convertedImageUrl || thumbnailUrl;

  // Reset state when modal closes
  const handleClose = () => {
    setImageLoaded(false);
    setFullScreenOpen(false);
    cleanup(); // Clean up worker and blob URLs
    onClose();
  };

  // Automatically convert when modal opens (check R2 cache first)
  useEffect(() => {
    const loadImage = async () => {
      if (open && photo?.DOWNLOAD_LINK && !convertedImageUrl && !converting) {
        // First, check if WebP is already cached in R2
        const isCached = await apiClient.isWebPCached(
          photo.IMAGE_NAME,
          photo.layerId,
        );

        if (isCached) {
          // Use the cached WebP from R2 (server-side)
          console.log(`Using R2-cached WebP for ${photo.IMAGE_NAME}`);
          // TODO: Load directly from R2 instead of converting
          // For now, we still convert locally but this will be improved
        }

        // Convert locally and upload to R2
        console.log(
          `Converting TIFF locally for ${photo.IMAGE_NAME} (using PNG for maximum quality)`,
        );
        const tiffUrl = apiClient.getTiffUrl(photo.IMAGE_NAME, photo.layerId);
        await convertTiff(tiffUrl, {
          quality: 100,
          imageName: photo.IMAGE_NAME,
          layerId: photo.layerId,
          uploadToR2: true,
          format: "png", // Use PNG for absolute maximum quality
        });
      }
    };

    loadImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, photo?.DOWNLOAD_LINK]);

  // Reset image loaded state when image URL changes
  useEffect(() => {
    setImageLoaded(false);
  }, [displayImageUrl]);

  if (!photo) return null;

  const handleFullScreen = () => {
    setFullScreenOpen(true);
  };

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
          <Typography
            variant="h6"
            component="span"
            sx={{ fontSize: "1rem", fontWeight: 500 }}
          >
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
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mb: 0.5 }}
              >
                <CircularProgress size={16} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: "0.75rem" }}
                >
                  Converting to WEBP... {conversionProgress}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={conversionProgress}
                sx={{ height: 4, borderRadius: 2 }}
              />
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
              console.error("Failed to load image:", displayImageUrl);
              setImageLoaded(true);
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
              <Box
                sx={{ display: "flex", gap: 0.75, mb: 1.5, flexWrap: "wrap" }}
              >
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
              <Typography
                variant="h6"
                gutterBottom
                sx={{ fontSize: "0.9375rem", fontWeight: 500 }}
              >
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
                <PhotoSizeSelectActual
                  sx={{ fontSize: 20, color: "text.secondary" }}
                />
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

      <DialogActions
        sx={{
          p: 2,
          gap: 1,
          justifyContent: "flex-end",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        {/* Error message (only show if conversion failed and we're using thumbnail) */}
        {conversionError && !convertedImageUrl && (
          <Box
            sx={{
              width: "100%",
              mb: 1,
              p: 1,
              bgcolor: "warning.light",
              borderRadius: 1,
            }}
          >
            <Typography
              variant="caption"
              color="warning.dark"
              sx={{ fontSize: "0.75rem" }}
            >
              Using thumbnail (conversion failed: {conversionError})
            </Typography>
          </Box>
        )}

        {/* Action buttons */}
        <Stack
          direction="row"
          spacing={1}
          justifyContent="flex-end"
          sx={{ width: "100%" }}
        >
          <Button
            onClick={handleClose}
            color="inherit"
            size="medium"
            sx={{ fontSize: "0.875rem", fontWeight: 500 }}
          >
            Close
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setThenNowModalOpen(true)}
            startIcon={<History />}
            size="medium"
            sx={{ fontSize: "0.875rem", fontWeight: 500 }}
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
              sx={{ fontSize: "0.875rem", fontWeight: 500 }}
            >
              Download TIFF
            </Button>
          )}
        </Stack>
      </DialogActions>

      {/* Full Screen Zoom with OpenSeadragon */}
      {fullScreenOpen && (
        <OpenSeadragonViewer
          imageUrl={displayImageUrl}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          onClose={() => setFullScreenOpen(false)}
          onThenNowClick={() => {
            setFullScreenOpen(false);
            setThenNowModalOpen(true);
          }}
        />
      )}

      {/* Then vs Now Modal */}
      <ThenNowModal
        open={thenNowModalOpen}
        photo={photo}
        onClose={() => setThenNowModalOpen(false)}
      />
    </Dialog>
  );
}

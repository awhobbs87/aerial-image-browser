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
import { useState, useEffect } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";
import ThenNowModal from "./ThenNowModal";

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

export default function PhotoPreviewModal({ photo, open, onClose }: PhotoPreviewModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [convertedImageUrl, setConvertedImageUrl] = useState<string | null>(null);
  const [useConvertedImage, setUseConvertedImage] = useState(false);
  const [fullScreenOpen, setFullScreenOpen] = useState(false);
  const [thenNowModalOpen, setThenNowModalOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const thumbnailUrl = photo ? apiClient.getThumbnailUrl(photo.IMAGE_NAME, photo.layerId) : "";
  const displayImageUrl = useConvertedImage && convertedImageUrl ? convertedImageUrl : thumbnailUrl;

  // Reset state when modal closes
  const handleClose = () => {
    setImageLoaded(false);
    setConverting(false);
    setConversionProgress(0);
    setConversionError(null);
    setUseConvertedImage(false);
    setFullScreenOpen(false);
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
        <TransformWrapper
          initialScale={1}
          minScale={0.5}
          maxScale={5}
          centerOnInit
          wheel={{ step: 0.1 }}
          pinch={{
            step: 0.5,
            disabled: false,
          }}
          doubleClick={{
            mode: "zoomIn",
            step: 0.7,
          }}
          panning={{
            disabled: false,
            velocityDisabled: false,
            lockAxisX: false,
            lockAxisY: false,
          }}
          disablePadding
          smooth
          limitToBounds={false}
        >
          {({ zoomIn, zoomOut, resetTransform, state }) => (
            <Box
              sx={{
                position: "relative",
                width: "100vw",
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden",
              }}
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
                }}
              >
                <Tooltip title="Zoom in">
                  <IconButton
                    onClick={() => zoomIn()}
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
                    onClick={() => zoomOut()}
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
                    onClick={() => resetTransform()}
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
                    onClick={() => setFullScreenOpen(false)}
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
                  {Math.round(state.scale * 100)}%
                </Typography>
              </Box>

              {/* Zoomed image with TransformComponent */}
              <TransformComponent
                wrapperStyle={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  touchAction: "none",
                }}
                contentStyle={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  key={displayImageUrl}
                  src={displayImageUrl}
                  alt={photo.IMAGE_NAME}
                  onDragStart={(e) => e.preventDefault()}
                  onContextMenu={(e) => e.preventDefault()}
                  style={{
                    width: "auto",
                    height: "auto",
                    maxWidth: "100vw",
                    maxHeight: "100vh",
                    objectFit: "contain",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    WebkitTouchCallout: "none",
                    pointerEvents: "none",
                  }}
                  draggable={false}
                />
              </TransformComponent>
            </Box>
          )}
        </TransformWrapper>
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

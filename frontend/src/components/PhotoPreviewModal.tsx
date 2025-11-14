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
} from "@mui/material";
import {
  Close,
  OpenInNew,
  Place,
  CalendarToday,
  PhotoSizeSelectActual,
  Image as ImageIcon,
} from "@mui/icons-material";
import { useState } from "react";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";

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

  if (!photo) return null;

  const thumbnailUrl = apiClient.getThumbnailUrl(photo.IMAGE_NAME, photo.layerId);
  const webpUrl = apiClient.getWebPUrl(photo.IMAGE_NAME, photo.layerId);

  // Estimate file size (WebP is typically 2-5MB, much smaller than 15-20MB TIFF)
  const estimatedSize = "~2-5 MB";

  const handleOpenFullImage = () => {
    window.open(webpUrl, "_blank");
    onClose();
  };

  const handleClose = () => {
    setImageLoaded(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ImageIcon color="primary" />
          <Typography variant="h6" component="span">
            Photo Preview
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
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
        {/* Thumbnail preview */}
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
            alt={photo.IMAGE_NAME}
            onLoad={() => setImageLoaded(true)}
            style={{
              maxWidth: "100%",
              maxHeight: "60vh",
              objectFit: "contain",
              display: imageLoaded ? "block" : "none",
            }}
          />
        </Box>

        {/* Photo metadata */}
        <Box sx={{ p: 3 }}>
          <Stack spacing={2}>
            {/* Header with chips */}
            <Box>
              <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
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
                />
                {photo.cached && (
                  <Chip label="Cached" color="success" size="small" variant="outlined" />
                )}
              </Box>
              <Typography variant="h5" gutterBottom fontWeight={600}>
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

            {/* File size warning */}
            <Box
              sx={{
                mt: 2,
                p: 2,
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(251, 191, 36, 0.1)" : "rgba(251, 191, 36, 0.1)",
                borderRadius: 2,
                border: (theme) =>
                  theme.palette.mode === "dark"
                    ? "1px solid rgba(251, 191, 36, 0.3)"
                    : "1px solid rgba(251, 191, 36, 0.3)",
              }}
            >
              <Typography variant="body2" color="warning.dark" fontWeight={600}>
                Full Resolution Image
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                Opening the full resolution WebP image ({estimatedSize}). Optimized for faster loading.
              </Typography>
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} color="inherit" size="large">
          Close
        </Button>
        <Button
          onClick={handleOpenFullImage}
          variant="contained"
          startIcon={<OpenInNew />}
          disabled={!photo.DOWNLOAD_LINK}
          size="large"
        >
          View Full Resolution
        </Button>
      </DialogActions>
    </Dialog>
  );
}

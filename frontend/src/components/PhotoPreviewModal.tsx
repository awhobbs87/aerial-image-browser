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
      className="rounded-xl"
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: '12px',
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        className="flex justify-between items-center pb-2"
        sx={{
          px: 2,
          pt: 2,
        }}
      >
        <Box className="flex items-center gap-2">
          <ImageIcon color="primary" />
          <Typography variant="h6" component="span" className="font-semibold">
            Photo Preview
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent className="p-0">
        {/* Larger preview at top */}
        <Box
          className="relative w-full bg-gray-100 dark:bg-gray-900 flex justify-center items-center"
          sx={{
            minHeight: { xs: 300, md: 450 },
            maxHeight: { xs: "50vh", md: "60vh" },
          }}
        >
          {!imageLoaded && (
            <CircularProgress
              size={60}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
            />
          )}
          <img
            src={thumbnailUrl}
            alt={photo.IMAGE_NAME}
            onLoad={() => setImageLoaded(true)}
            className="max-w-full max-h-full object-contain"
            style={{
              display: imageLoaded ? "block" : "none",
            }}
          />
        </Box>

        {/* Photo metadata - Grouped using MUI Card */}
        <Box className="p-4 md:p-6">
          <Stack spacing={3}>
            {/* Header with chips */}
            <Box>
              <Box className="flex gap-2 mb-3 flex-wrap">
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
                  className="font-semibold"
                />
                {photo.cached && (
                  <Chip label="Cached" color="success" size="small" variant="outlined" />
                )}
              </Box>
              <Typography variant="h5" className="font-semibold mb-1">
                {photo.dateFormatted || "Unknown Date"}
              </Typography>
            </Box>

            {/* Metadata grouped in Card */}
            <Box
              className="rounded-lg p-4"
              sx={{
                bgcolor: (theme) =>
                  theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
                border: (theme) =>
                  theme.palette.mode === "dark" ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid rgba(0, 0, 0, 0.08)",
              }}
            >
              <Stack spacing={2}>
                <Box className="flex items-center gap-2">
                  <CalendarToday sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Date:
                  </Typography>
                  <Typography variant="body2" className="font-medium">
                    {photo.dateFormatted || "Unknown"}
                  </Typography>
                </Box>

                <Box className="flex items-center gap-2">
                  <PhotoSizeSelectActual sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    Scale:
                  </Typography>
                  <Typography variant="body2" className="font-medium">
                    {photo.scaleFormatted || "N/A"}
                  </Typography>
                </Box>

                <Box className="flex items-center gap-2">
                  <ImageIcon sx={{ fontSize: 18, color: "text.secondary" }} />
                  <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                    File:
                  </Typography>
                  <Typography
                    variant="body2"
                    className="font-medium truncate"
                    sx={{
                      maxWidth: 300,
                    }}
                  >
                    {photo.IMAGE_NAME}
                  </Typography>
                </Box>

                {photo.geometry && (
                  <Box className="flex items-center gap-2">
                    <Place sx={{ fontSize: 18, color: "text.secondary" }} />
                    <Typography variant="body2" className="text-gray-600 dark:text-gray-400">
                      Location:
                    </Typography>
                    <Typography variant="body2" className="font-medium">
                      Available on map
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <Divider />

      {/* Single bottom action bar */}
      <DialogActions className="p-4 gap-2">
        <Button onClick={handleClose} color="inherit" size="medium" className="flex-1">
          Close
        </Button>
        {photo.DOWNLOAD_LINK && (
          <Button
            variant="contained"
            color="success"
            component="a"
            href={photo.DOWNLOAD_LINK}
            target="_blank"
            rel="noopener noreferrer"
            fullWidth
            className="font-semibold"
            sx={{
              textTransform: 'none',
            }}
          >
            Download TIFF
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

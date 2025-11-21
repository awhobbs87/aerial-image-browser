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
  Place,
  CalendarToday,
  PhotoSizeSelectActual,
  Image as ImageIcon,
  Download,
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

const CONVERTHUB_API_KEY = "105|JtAffUYt5zBXC6JpXLL2lxn4nrLvJQbTLMAwScCd1bd830cb";
const CONVERTHUB_API_URL = "https://api.converthub.com/v1/convert";

export default function PhotoPreviewModal({ photo, open, onClose }: PhotoPreviewModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [converting, setConverting] = useState(false);
  const [conversionProgress, setConversionProgress] = useState(0);
  const [conversionError, setConversionError] = useState<string | null>(null);
  const [webpUrl, setWebpUrl] = useState<string | null>(null);

  if (!photo) return null;

  const thumbnailUrl = apiClient.getThumbnailUrl(photo.IMAGE_NAME, photo.layerId);

  // Estimate file size for TIFF
  const estimatedSize = "~10-30 MB";

  const handleClose = () => {
    setImageLoaded(false);
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
    if (!photo.DOWNLOAD_LINK) {
      setConversionError("No download link available");
      return;
    }

    setConverting(true);
    setConversionProgress(0);
    setConversionError(null);

    try {
      // Step 1: Fetch the TIFF file
      setConversionProgress(10);
      const tiffResponse = await fetch(photo.DOWNLOAD_LINK);
      if (!tiffResponse.ok) {
        throw new Error(`Failed to fetch TIFF: ${tiffResponse.statusText}`);
      }

      setConversionProgress(30);
      const tiffBlob = await tiffResponse.blob();

      // Step 2: Convert using ConvertHub API
      setConversionProgress(40);
      const formData = new FormData();
      formData.append("file", tiffBlob, photo.IMAGE_NAME);
      formData.append("target_format", "webp");
      formData.append("quality", "95"); // High quality

      const convertResponse = await fetch(CONVERTHUB_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CONVERTHUB_API_KEY}`,
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData,
      });

      setConversionProgress(70);

      if (!convertResponse.ok) {
        let errorText = "";
        try {
          const errorJson = await convertResponse.json();
          errorText = errorJson.message || errorJson.error || JSON.stringify(errorJson);
        } catch {
          errorText = await convertResponse.text();
        }
        throw new Error(`Conversion failed: ${convertResponse.status} - ${errorText}`);
      }

      setConversionProgress(90);
      
      // Check if response is JSON (with download URL) or binary (direct file)
      const contentType = convertResponse.headers.get("content-type") || "";
      let webpBlob: Blob;
      
      if (contentType.includes("application/json")) {
        // API returned JSON with download URL
        const jsonResponse = await convertResponse.json();
        const downloadUrl = jsonResponse.download_url || jsonResponse.url || jsonResponse.file_url;
        if (!downloadUrl) {
          throw new Error("No download URL in API response");
        }
        
        // Fetch the converted file
        const downloadResponse = await fetch(downloadUrl);
        if (!downloadResponse.ok) {
          throw new Error(`Failed to download converted file: ${downloadResponse.statusText}`);
        }
        webpBlob = await downloadResponse.blob();
      } else {
        // Direct binary response
        webpBlob = await convertResponse.blob();
      }

      // Step 3: Create download URL
      const url = URL.createObjectURL(webpBlob);
      setWebpUrl(url);
      setConversionProgress(100);

      // Trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = photo.IMAGE_NAME.replace(/\.tif(f)?$/i, ".webp");
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

      <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'flex-end', borderTop: 1, borderColor: 'divider', flexDirection: 'column', alignItems: 'stretch' }}>
        {/* Progress indicator */}
        {converting && (
          <Box sx={{ width: '100%', mb: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <CircularProgress size={16} />
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Converting to WEBP... {conversionProgress}%
              </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={conversionProgress} sx={{ height: 4, borderRadius: 2 }} />
          </Box>
        )}

        {/* Error message */}
        {conversionError && (
          <Box sx={{ width: '100%', mb: 1, p: 1, bgcolor: 'error.light', borderRadius: 1 }}>
            <Typography variant="caption" color="error" sx={{ fontSize: '0.75rem' }}>
              {conversionError}
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
            onClick={handleConvertToWebP}
            disabled={converting || !photo.DOWNLOAD_LINK}
            startIcon={converting ? <CircularProgress size={16} /> : <Download />}
            size="medium"
            sx={{ fontSize: '0.875rem', fontWeight: 500 }}
          >
            Convert to WEBP
          </Button>
          {photo.DOWNLOAD_LINK && (
            <Button
              variant="contained"
              component="a"
              href={photo.DOWNLOAD_LINK}
              target="_blank"
              rel="noopener noreferrer"
              size="medium"
              sx={{ fontSize: '0.875rem', fontWeight: 500 }}
            >
              Download TIFF
            </Button>
          )}
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

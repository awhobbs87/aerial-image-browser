import { memo } from "react";
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  IconButton,
  Stack,
  Box,
  Tooltip,
} from "@mui/material";
import {
  Download,
  Favorite,
  FavoriteBorder,
  CheckCircle,
  Map as MapIcon,
  Visibility,
  GetApp,
} from "@mui/icons-material";
import type { EnhancedPhoto, LayerType } from "../types/api";
import apiClient from "../lib/apiClient";
import LazyImage from "./LazyImage";

interface PhotoCardProps {
  photo: EnhancedPhoto;
  onFavorite?: (photo: EnhancedPhoto) => void;
  onShowOnMap?: (photo: EnhancedPhoto) => void;
  onPhotoHover?: (photo: EnhancedPhoto | null) => void;
  isFavorite?: boolean;
}

const LAYER_TYPE_COLORS: Record<LayerType, "primary" | "success" | "error"> = {
  aerial: "primary",
  ortho: "success",
  digital: "error",
};

function PhotoCard({
  photo,
  onFavorite,
  onShowOnMap,
  onPhotoHover,
  isFavorite = false,
}: PhotoCardProps) {
  const thumbnailUrl = apiClient.getThumbnailUrl(photo.IMAGE_NAME, photo.layerId);
  const tiffUrl = apiClient.getTiffUrl(photo.IMAGE_NAME, photo.layerId);

  const handleViewImage = () => {
    // Open TIFF directly to preserve maximum quality for zooming
    window.open(tiffUrl, "_blank");
  };

  const handleDownloadTiff = () => {
    // Create a download link that forces download
    const link = document.createElement('a');
    link.href = tiffUrl;
    link.download = photo.IMAGE_NAME;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFavorite = () => {
    if (onFavorite) {
      onFavorite(photo);
    }
  };

  const handleShowOnMap = () => {
    if (onShowOnMap) {
      onShowOnMap(photo);
    }
  };

  return (
    <Card
      sx={{ height: "100%", display: "flex", flexDirection: "column", transition: "all 0.2s" }}
      onMouseEnter={() => onPhotoHover?.(photo)}
      onMouseLeave={() => onPhotoHover?.(null)}
    >
      <LazyImage src={thumbnailUrl} alt={photo.IMAGE_NAME} height={150} />
      <CardContent sx={{ flexGrow: 1, py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={0.75}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1 }}>
            <Chip
              label={photo.layerType.toUpperCase()}
              color={LAYER_TYPE_COLORS[photo.layerType]}
              size="small"
            />
            {photo.cached && (
              <Tooltip title="TIFF cached in R2">
                <Chip
                  icon={<CheckCircle />}
                  label="Cached"
                  color="success"
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
          </Box>

          <Typography variant="subtitle2" component="div" sx={{ fontSize: "0.9rem", fontWeight: 600, lineHeight: 1.3 }}>
            {photo.IMAGE_NAME}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
            <strong>Date:</strong> {photo.dateFormatted || "Unknown"}
          </Typography>

          <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
            <strong>Scale:</strong> {photo.scaleFormatted || "N/A"}
          </Typography>
        </Stack>
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 1.5, pt: 0 }}>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="View image">
            <IconButton
              size="small"
              color="primary"
              onClick={handleViewImage}
              disabled={!photo.DOWNLOAD_LINK}
            >
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Download original TIFF">
            <IconButton
              size="small"
              color="primary"
              onClick={handleDownloadTiff}
              disabled={!photo.DOWNLOAD_LINK}
            >
              <GetApp fontSize="small" />
            </IconButton>
          </Tooltip>

          {onShowOnMap && photo.geometry && (
            <Tooltip title="Show on map">
              <IconButton size="small" color="primary" onClick={handleShowOnMap}>
                <MapIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"}>
          <IconButton size="small" color="error" onClick={handleFavorite}>
            {isFavorite ? <Favorite fontSize="small" /> : <FavoriteBorder fontSize="small" />}
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

export default memo(PhotoCard);

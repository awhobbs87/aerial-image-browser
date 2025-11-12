import {
  Card,
  CardMedia,
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
  Image as ImageIcon,
  CheckCircle,
  Map as MapIcon,
} from "@mui/icons-material";
import type { EnhancedPhoto, LayerType } from "../types/api";
import apiClient from "../lib/apiClient";

interface PhotoCardProps {
  photo: EnhancedPhoto;
  onFavorite?: (photo: EnhancedPhoto) => void;
  onShowOnMap?: (photo: EnhancedPhoto) => void;
  isFavorite?: boolean;
}

const LAYER_TYPE_COLORS: Record<LayerType, "primary" | "success" | "error"> = {
  aerial: "primary",
  ortho: "success",
  digital: "error",
};

export default function PhotoCard({
  photo,
  onFavorite,
  onShowOnMap,
  isFavorite = false,
}: PhotoCardProps) {
  const thumbnailUrl = apiClient.getThumbnailUrl(photo.IMAGE_NAME, photo.layerId);
  const tiffUrl = apiClient.getTiffUrl(photo.IMAGE_NAME, photo.layerId);

  const handleDownload = () => {
    window.open(tiffUrl, "_blank");
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
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia
        component="img"
        height="200"
        image={thumbnailUrl}
        alt={photo.IMAGE_NAME}
        sx={{
          objectFit: "cover",
          bgcolor: "grey.200",
        }}
        onError={(e: any) => {
          e.target.src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E%3Crect width='300' height='200' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23999'%3ENo Thumbnail%3C/text%3E%3C/svg%3E";
        }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack spacing={1}>
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

          <Typography variant="h6" component="div" sx={{ fontSize: "1rem", fontWeight: 600 }}>
            {photo.IMAGE_NAME}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            <strong>Date:</strong> {photo.dateFormatted || "Unknown"}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            <strong>Scale:</strong> {photo.scaleFormatted || "N/A"}
          </Typography>

          {photo.IMAGE_TYPE && (
            <Typography variant="body2" color="text.secondary">
              <strong>Type:</strong> {photo.IMAGE_TYPE}
            </Typography>
          )}

          {photo.PROJ_NAME && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <strong>Project:</strong> {photo.PROJ_NAME}
            </Typography>
          )}
        </Stack>
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 2 }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Download TIFF">
            <IconButton
              color="primary"
              onClick={handleDownload}
              disabled={!photo.DOWNLOAD_LINK}
            >
              <Download />
            </IconButton>
          </Tooltip>

          {onShowOnMap && photo.geometry && (
            <Tooltip title="Show on map">
              <IconButton color="primary" onClick={handleShowOnMap}>
                <MapIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"}>
          <IconButton color="error" onClick={handleFavorite}>
            {isFavorite ? <Favorite /> : <FavoriteBorder />}
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

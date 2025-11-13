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
import { layerTypeColors, borderRadius, fontSize, iconSize } from "../theme/tokens";

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

const LAYER_TYPE_LABELS: Record<LayerType, string> = {
  aerial: "AERIAL",
  ortho: "ORTHO",
  digital: "DIGITAL",
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
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: `${borderRadius.lg}px`,
        overflow: "hidden",
        position: "relative",
        borderLeft: `4px solid ${layerTypeColors[photo.layerType].border}`,
      }}
      onMouseEnter={() => onPhotoHover?.(photo)}
      onMouseLeave={() => onPhotoHover?.(null)}
    >
      {/* Thumbnail with inner shadow */}
      <Box
        sx={{
          position: "relative",
          height: 150,
          overflow: "hidden",
          '&::after': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.1)',
            pointerEvents: 'none',
          },
        }}
      >
        <LazyImage src={thumbnailUrl} alt={photo.IMAGE_NAME} height={150} />
      </Box>

      <CardContent sx={{ flexGrow: 1, py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Stack spacing={1}>
          {/* Chips row */}
          <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
            <Chip
              label={LAYER_TYPE_LABELS[photo.layerType]}
              color={LAYER_TYPE_COLORS[photo.layerType]}
              size="small"
              sx={{
                fontSize: fontSize.xs,
                height: 22,
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}
            />
            {photo.cached && (
              <Tooltip title="TIFF cached in R2 - faster loading" arrow placement="top">
                <Chip
                  icon={<CheckCircle sx={{ fontSize: `${iconSize.sm}px !important` }} />}
                  label="Cached"
                  color="success"
                  size="small"
                  variant="outlined"
                  sx={{
                    fontSize: fontSize.xs,
                    height: 22,
                    fontWeight: 600,
                  }}
                />
              </Tooltip>
            )}
          </Box>

          {/* Metadata with improved hierarchy */}
          <Box>
            {/* Date - most prominent */}
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontSize: fontSize.md,
                fontWeight: 600,
                lineHeight: 1.4,
                mb: 0.5,
                color: 'text.primary',
              }}
            >
              {photo.dateFormatted || "Unknown Date"}
            </Typography>

            {/* Scale - secondary */}
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontSize: fontSize.sm,
                fontWeight: 500,
                mb: 0.5,
              }}
            >
              {photo.scaleFormatted || "N/A"}
            </Typography>

            {/* Image name - tertiary, subdued */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontSize: fontSize.xs,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                opacity: 0.8,
              }}
              title={photo.IMAGE_NAME}
            >
              {photo.IMAGE_NAME}
            </Typography>
          </Box>
        </Stack>
      </CardContent>

      <CardActions sx={{ justifyContent: "space-between", px: 2, pb: 1.5, pt: 0 }}>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="View full resolution image" arrow placement="top">
            <IconButton
              size="small"
              color="primary"
              onClick={handleViewImage}
              disabled={!photo.DOWNLOAD_LINK}
              sx={{
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
            >
              <Visibility sx={{ fontSize: iconSize.md }} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Download original TIFF file" arrow placement="top">
            <IconButton
              size="small"
              color="primary"
              onClick={handleDownloadTiff}
              disabled={!photo.DOWNLOAD_LINK}
              sx={{
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
            >
              <GetApp sx={{ fontSize: iconSize.md }} />
            </IconButton>
          </Tooltip>

          {onShowOnMap && photo.geometry && (
            <Tooltip title="Show on map" arrow placement="top">
              <IconButton
                size="small"
                color="primary"
                onClick={handleShowOnMap}
                sx={{
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                }}
              >
                <MapIcon sx={{ fontSize: iconSize.md }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"} arrow placement="top">
          <IconButton
            size="small"
            color="error"
            onClick={handleFavorite}
            sx={{
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              '&:hover': {
                transform: 'scale(1.15) rotate(5deg)',
              },
            }}
          >
            {isFavorite ? (
              <Favorite sx={{ fontSize: iconSize.md }} />
            ) : (
              <FavoriteBorder sx={{ fontSize: iconSize.md }} />
            )}
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

export default memo(PhotoCard);

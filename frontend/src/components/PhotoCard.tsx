import { memo, useState } from "react";
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
  OpenInNew,
} from "@mui/icons-material";
import type { EnhancedPhoto, LayerType } from "../types/api";
import apiClient from "../lib/apiClient";
import LazyImage from "./LazyImage";
import PhotoPreviewModal from "./PhotoPreviewModal";
import { layerTypeColors, borderRadius, fontSize, iconSize } from "../theme/tokens";

interface PhotoCardProps {
  photo: EnhancedPhoto;
  onFavorite?: (photo: EnhancedPhoto) => void;
  onShowOnMap?: (photo: EnhancedPhoto) => void;
  onPhotoHover?: (photo: EnhancedPhoto | null) => void;
  onThumbnailClick?: (photo: EnhancedPhoto) => void;
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
  onThumbnailClick,
  isFavorite = false,
}: PhotoCardProps) {
  const thumbnailUrl = apiClient.getThumbnailUrl(photo.IMAGE_NAME, photo.layerId);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleViewImage = () => {
    // Open preview modal instead of directly opening TIFF
    setPreviewOpen(true);
  };

  const handleThumbnailClick = () => {
    if (onThumbnailClick) {
      onThumbnailClick(photo);
    }
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
    <>
      <PhotoPreviewModal photo={photo} open={previewOpen} onClose={() => setPreviewOpen(false)} />
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
        onClick={handleThumbnailClick}
        sx={{
          position: "relative",
          height: 150,
          overflow: "hidden",
          cursor: onThumbnailClick ? 'pointer' : 'default',
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
          ...(onThumbnailClick && {
            '&:hover': {
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(0, 0, 0, 0.3)',
                zIndex: 1,
                pointerEvents: 'none',
              },
            },
          }),
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

          {/* Metadata with compact hierarchy */}
          <Box>
            {/* Date and Scale on same line */}
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.25 }}>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontSize: fontSize.sm,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  color: 'text.primary',
                }}
              >
                {photo.dateFormatted || "Unknown Date"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontSize: fontSize.xs,
                  fontWeight: 500,
                }}
              >
                {photo.scaleFormatted || "N/A"}
              </Typography>
            </Box>

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
                opacity: 0.7,
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
          <Tooltip title="Preview image" arrow placement="top">
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

          <Tooltip title="View full resolution image (long-press on iOS to download)" arrow placement="top">
            <Box
              component="a"
              href={photo.DOWNLOAD_LINK || undefined}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 32,
                height: 32,
                borderRadius: '50%',
                color: 'warning.main',
                textDecoration: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                ...(photo.DOWNLOAD_LINK ? {
                  '&:hover': {
                    transform: 'scale(1.1)',
                    bgcolor: 'action.hover',
                  },
                  '&:active': {
                    transform: 'scale(0.95)',
                  },
                } : {
                  opacity: 0.38,
                  pointerEvents: 'none',
                }),
              }}
            >
              <OpenInNew sx={{ fontSize: iconSize.md }} />
            </Box>
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
    </>
  );
}

export default memo(PhotoCard);

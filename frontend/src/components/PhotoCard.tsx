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
  CircularProgress,
  Checkbox,
  Divider,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  CheckCircle,
  Map as MapIcon,
  Visibility,
  Download,
  OpenInNew,
} from "@mui/icons-material";
import type { EnhancedPhoto, LayerType } from "../types/api";
import apiClient from "../lib/apiClient";
import LazyImage from "./LazyImage";
import PhotoViewer from "./PhotoViewer";
import { layerTypeColors, borderRadius, fontSize, iconSize } from "../theme/tokens";

interface PhotoCardProps {
  photo: EnhancedPhoto;
  onFavorite?: (photo: EnhancedPhoto) => void;
  onShowOnMap?: (photo: EnhancedPhoto) => void;
  onPhotoHover?: (photo: EnhancedPhoto | null) => void;
  onThumbnailClick?: (photo: EnhancedPhoto) => void;
  isFavorite?: boolean;
  onSelectToggle?: (photo: EnhancedPhoto) => void;
  isSelected?: boolean;
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
  onSelectToggle,
  isSelected = false,
}: PhotoCardProps) {
  const thumbnailUrl = apiClient.getThumbnailUrl(photo.IMAGE_NAME, photo.layerId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleViewImage = () => {
    setPreviewOpen(true);
  };

  const handleThumbnailClick = () => {
    if (onThumbnailClick) {
      onThumbnailClick(photo);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onFavorite) {
      onFavorite(photo);
    }
  };

  const handleShowOnMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onShowOnMap) {
      onShowOnMap(photo);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!photo.DOWNLOAD_LINK || downloading) return;

    setDownloading(true);
    try {
      const downloadUrl = apiClient.getWebPUrl(photo.IMAGE_NAME, photo.layerId);

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${photo.IMAGE_NAME.replace(/\.tif$/i, '')}.webp`;
      link.style.display = 'none';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      if (photo.DOWNLOAD_LINK) {
        window.open(photo.DOWNLOAD_LINK, '_blank');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleSelectToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectToggle?.(photo);
  };

  return (
    <>
      <PhotoViewer photo={photo} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      <Card
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          borderRadius: `${borderRadius.lg}px`,
          overflow: "hidden",
          position: "relative",
          borderLeft: `4px solid ${layerTypeColors[photo.layerType].border}`,
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 8px 24px rgba(0, 0, 0, 0.5)'
                : '0 8px 24px rgba(0, 0, 0, 0.15)',
          },
        }}
        onMouseEnter={() => onPhotoHover?.(photo)}
        onMouseLeave={() => onPhotoHover?.(null)}
      >
        {/* Thumbnail with overlays */}
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

          {/* Selection checkbox - wrapped in clickable div */}
          <Tooltip
            title={
              isSelected
                ? "Selected for comparison"
                : "Select for comparison"
            }
            arrow
            placement="right"
          >
            <Box
              onClick={handleSelectToggle}
              sx={{
                position: "absolute",
                top: 6,
                left: 6,
                zIndex: 2,
                cursor: 'pointer',
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(0,0,0,0.7)"
                    : "rgba(255,255,255,0.9)",
                borderRadius: 1,
                '&:hover': {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(0,0,0,0.85)"
                      : "rgba(255,255,255,1)",
                },
              }}
            >
              <Checkbox
                checked={isSelected}
                color="secondary"
                inputProps={{ "aria-label": "Select photo for comparison" }}
              />
            </Box>
          </Tooltip>
        </Box>

        {/* Card content - metadata */}
        <CardContent sx={{ flexGrow: 1, py: 1.5, px: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Stack spacing={1}>
            {/* Type and status chips */}
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

            {/* Date and Scale */}
            <Box>
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontSize: fontSize.sm,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  color: 'text.primary',
                  mb: 0.25,
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

            {/* Image name */}
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
          </Stack>
        </CardContent>

        <Divider sx={{ mx: 1.5 }} />

        {/* Action buttons - always visible, organized logically */}
        <CardActions
          sx={{
            justifyContent: "space-between",
            px: 1.5,
            py: 1,
            gap: 0.5,
            "& .MuiIconButton-root": {
              minWidth: { xs: 44, sm: 40 }, // Better touch targets on mobile
              minHeight: { xs: 44, sm: 40 },
            },
          }}
        >
          {/* Left side - View actions */}
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Preview image" arrow placement="top">
              <IconButton
                size="small"
                color="primary"
                onClick={handleViewImage}
                disabled={!photo.DOWNLOAD_LINK}
                sx={{
                  transition: 'all 0.2s ease',
                  '&:hover': { transform: 'scale(1.1)' },
                }}
              >
                <Visibility sx={{ fontSize: iconSize.md }} />
              </IconButton>
            </Tooltip>

            {onShowOnMap && photo.geometry && (
              <Tooltip title="Show on map" arrow placement="top">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={handleShowOnMap}
                  sx={{
                    transition: 'all 0.2s ease',
                    '&:hover': { transform: 'scale(1.1)' },
                  }}
                >
                  <MapIcon sx={{ fontSize: iconSize.md }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>

          {/* Right side - Download and favorite */}
          <Stack direction="row" spacing={0.5}>
            {photo.DOWNLOAD_LINK && (
              <>
                <Tooltip title="Download (2-5 MB)" arrow placement="top">
                  <IconButton
                    size="small"
                    color="secondary"
                    onClick={handleDownload}
                    disabled={downloading}
                    sx={{
                      transition: 'all 0.2s ease',
                      '&:hover': { transform: 'scale(1.1)' },
                    }}
                  >
                    {downloading ? (
                      <CircularProgress size={18} color="secondary" />
                    ) : (
                      <Download sx={{ fontSize: iconSize.md }} />
                    )}
                  </IconButton>
                </Tooltip>

                <Tooltip title="Open original TIFF in new tab" arrow placement="top">
                  <Box
                    component="a"
                    href={photo.DOWNLOAD_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      fontSize: fontSize.xs,
                      color: 'primary.main',
                      textDecoration: 'none',
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        textDecoration: 'underline',
                        color: 'primary.dark',
                      },
                    }}
                  >
                    <OpenInNew sx={{ fontSize: 14 }} />
                    TIFF
                  </Box>
                </Tooltip>
              </>
            )}

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
          </Stack>
        </CardActions>
      </Card>
    </>
  );
}

export default memo(PhotoCard);

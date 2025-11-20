import { memo, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Stack,
  Box,
  Tooltip,
  CircularProgress,
  Checkbox,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  CheckCircle,
  Map as MapIcon,
  Visibility,
  Download,
} from "@mui/icons-material";
import type { EnhancedPhoto, LayerType } from "../types/api";
import apiClient from "../lib/apiClient";
import LazyImage from "./LazyImage";
import PhotoViewer from "./PhotoViewer";
import { layerTypeColors, fontSize, iconSize } from "../theme/tokens";

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
        className={`h-full flex flex-col rounded-xl overflow-hidden relative transition-all duration-200 ${
          isSelected 
            ? 'border-l-4 border-emerald-400 shadow-lg' 
            : 'border-l-4'
        }`}
        sx={{
          borderLeftColor: isSelected 
            ? '#34d399' 
            : layerTypeColors[photo.layerType].border,
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 8px 24px rgba(0, 0, 0, 0.5)'
                : '0 8px 24px rgba(0, 0, 0, 0.15)',
            '& .action-strip': {
              opacity: 1,
            },
          },
        }}
        onMouseEnter={() => onPhotoHover?.(photo)}
        onMouseLeave={() => onPhotoHover?.(null)}
      >
        {/* Thumbnail with overlays - Square/4:3 aspect ratio */}
        <Box
          onClick={handleThumbnailClick}
          className="relative overflow-hidden cursor-pointer aspect-[4/3]"
          sx={{
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
                '& .action-strip': {
                  opacity: 1,
                },
              },
            }),
          }}
        >
          <LazyImage src={thumbnailUrl} alt={photo.IMAGE_NAME} height={200} />

          {/* Selection checkbox */}
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
              className="absolute top-2 left-2 z-10 cursor-pointer bg-white/90 dark:bg-black/70 rounded hover:bg-white dark:hover:bg-black/85 transition-colors"
            >
              <Checkbox
                checked={isSelected}
                color="secondary"
                size="small"
                inputProps={{ "aria-label": "Select photo for comparison" }}
              />
            </Box>
          </Tooltip>

          {/* Hover-only action strip */}
          <Box
            className="action-strip absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 p-2 z-10"
            sx={{
              opacity: 0,
              transition: 'opacity 0.2s ease',
              bgcolor: 'rgba(0, 0, 0, 0.6)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Tooltip title="Preview image" arrow placement="top">
              <IconButton
                size="small"
                className="!text-white hover:!bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewImage();
                }}
                disabled={!photo.DOWNLOAD_LINK}
              >
                <Visibility sx={{ fontSize: iconSize.md }} />
              </IconButton>
            </Tooltip>
            {onShowOnMap && photo.geometry && (
              <Tooltip title="Show on map" arrow placement="top">
                <IconButton
                  size="small"
                  className="!text-white hover:!bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowOnMap(e);
                  }}
                >
                  <MapIcon sx={{ fontSize: iconSize.md }} />
                </IconButton>
              </Tooltip>
            )}
            {photo.DOWNLOAD_LINK && (
              <Tooltip title="Download WebP" arrow placement="top">
                <IconButton
                  size="small"
                  className="!text-white hover:!bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(e);
                  }}
                  disabled={downloading}
                >
                  {downloading ? (
                    <CircularProgress size={18} className="!text-white" />
                  ) : (
                    <Download sx={{ fontSize: iconSize.md }} />
                  )}
                </IconButton>
              </Tooltip>
            )}
            {onFavorite && (
              <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"} arrow placement="top">
                <IconButton
                  size="small"
                  className="!text-white hover:!bg-white/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFavorite(e);
                  }}
                >
                  {isFavorite ? (
                    <Favorite sx={{ fontSize: iconSize.md }} />
                  ) : (
                    <FavoriteBorder sx={{ fontSize: iconSize.md }} />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Card content - metadata */}
        <CardContent className="flex-grow p-3">
          <Stack spacing={1.5}>
            {/* AERIAL chip - MUI Chip small */}
            <Box className="flex gap-1.5 flex-wrap">
              <Chip
                label={LAYER_TYPE_LABELS[photo.layerType]}
                color={LAYER_TYPE_COLORS[photo.layerType]}
                size="small"
                className="text-xs font-semibold"
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
                    className="text-xs font-semibold"
                    sx={{
                      fontSize: fontSize.xs,
                      height: 22,
                      fontWeight: 600,
                    }}
                  />
                </Tooltip>
              )}
            </Box>

            {/* Date + Scale text - Tailwind typography */}
            <Box>
              <Typography
                variant="h6"
                component="div"
                className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-0.5"
              >
                {photo.dateFormatted || "Unknown Date"}
              </Typography>
              <Typography
                variant="body2"
                className="text-xs font-medium text-gray-600 dark:text-gray-400"
              >
                {photo.scaleFormatted || "N/A"}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}

export default memo(PhotoCard);

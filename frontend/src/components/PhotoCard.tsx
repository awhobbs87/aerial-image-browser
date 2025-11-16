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
  const [downloading, setDownloading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent thumbnail click
    if (!photo.DOWNLOAD_LINK || downloading) return;

    setDownloading(true);
    try {
      // Use WebP URL for smaller file size (2-5 MB vs 15-20 MB)
      const downloadUrl = apiClient.getWebPUrl(photo.IMAGE_NAME, photo.layerId);
      
      // Fetch the file as a blob
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download file');
      }
      
      const blob = await response.blob();
      
      // Create object URL
      const objectUrl = URL.createObjectURL(blob);
      
      // Create temporary anchor element
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${photo.IMAGE_NAME.replace(/\.tif$/i, '')}.webp`;
      link.style.display = 'none';
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up object URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: try opening in new tab if download fails
      if (photo.DOWNLOAD_LINK) {
        window.open(photo.DOWNLOAD_LINK, '_blank');
      }
    } finally {
      setDownloading(false);
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
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 8px 24px rgba(0, 0, 0, 0.5)'
              : '0 8px 24px rgba(0, 0, 0, 0.15)',
        },
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        onPhotoHover?.(photo);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onPhotoHover?.(null);
      }}
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
        
        {/* Download icon overlay - top-right */}
        {photo.DOWNLOAD_LINK && (
          <Tooltip title="Right-click to save or click to download (2-5 MB)" arrow placement="left">
            <Box
              component="a"
              href={apiClient.getWebPUrl(photo.IMAGE_NAME, photo.layerId)}
              download={`${photo.IMAGE_NAME.replace(/\.tif$/i, '')}.webp`}
              onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                // Prevent default and use custom download on left-click
                // This allows fallback download behavior
                e.stopPropagation();
                e.preventDefault();
                handleDownload(e as unknown as React.MouseEvent);
              }}
              onContextMenu={(e: React.MouseEvent<HTMLAnchorElement>) => {
                // Allow right-click context menu (browser's "Save link as")
                e.stopPropagation();
              }}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.7)'
                    : 'rgba(255, 255, 255, 0.9)',
                color: 'warning.main',
                width: 40,
                height: 40,
                borderRadius: '50%',
                boxShadow: (theme) =>
                  theme.palette.mode === 'dark'
                    ? '0 2px 8px rgba(0, 0, 0, 0.5)'
                    : '0 2px 8px rgba(0, 0, 0, 0.2)',
                '&:hover': {
                  bgcolor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(0, 0, 0, 0.85)'
                      : 'rgba(255, 255, 255, 1)',
                  transform: 'scale(1.1)',
                  boxShadow: (theme) =>
                    theme.palette.mode === 'dark'
                      ? '0 4px 12px rgba(0, 0, 0, 0.6)'
                      : '0 4px 12px rgba(0, 0, 0, 0.3)',
                },
                '&:active': {
                  transform: 'scale(0.95)',
                },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: downloading ? 'none' : 'auto',
                opacity: downloading ? 0.6 : 1,
              }}
            >
              {downloading ? (
                <CircularProgress size={20} color="warning" />
              ) : (
                <Download sx={{ fontSize: 22 }} />
              )}
            </Box>
          </Tooltip>
        )}
      </Box>

      <CardContent sx={{ flexGrow: 1, py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
        <Stack spacing={0.75}>
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

      <CardActions
        sx={{
          justifyContent: "space-between",
          px: 1.5,
          pb: 1,
          pt: 0,
          opacity: isHovered ? 1 : 0,
          transform: isHovered ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.2s ease, transform 0.2s ease',
        }}
      >
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title="Preview image in modal" arrow placement="top">
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

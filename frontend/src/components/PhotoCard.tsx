import { memo, useState } from "react";
import {
  Card,
  Typography,
  Chip,
  IconButton,
  Box,
  Tooltip,
  CircularProgress,
  Checkbox,
  Link,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  Visibility,
  Download,
} from "@mui/icons-material";
import type { EnhancedPhoto, LayerType } from "../types/api";
import apiClient from "../lib/apiClient";
import LazyImage from "./LazyImage";
import PhotoViewer from "./PhotoViewer";

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

const LAYER_TYPE_LABELS: Record<LayerType, string> = {
  aerial: "AERIAL",
  ortho: "ORTHO",
  digital: "DIGITAL",
};

function PhotoCard({
  photo,
  onFavorite,
  onPhotoHover,
  onThumbnailClick,
  isFavorite = false,
  onSelectToggle,
  isSelected = false,
}: PhotoCardProps) {
  const thumbnailUrl = apiClient.getThumbnailUrl(photo.IMAGE_NAME, photo.layerId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleViewImage = (e: React.MouseEvent) => {
    e.stopPropagation();
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
          borderRadius: 1.5,
          overflow: "hidden",
          position: "relative",
          maxWidth: '100%',
          border: (theme) =>
            isSelected
              ? `2px solid ${theme.palette.mode === 'dark' ? '#10B981' : '#059669'}`
              : `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)'}`,
          bgcolor: (theme) =>
            theme.palette.mode === 'dark'
              ? 'rgba(42, 42, 42, 0.6)' // surfaceElevated
              : 'rgba(255, 255, 255, 0.9)', // surface
          boxShadow: (theme) =>
            theme.palette.mode === 'dark'
              ? '0 1px 3px rgba(0, 0, 0, 0.3)'
              : '0 1px 3px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: (theme) =>
              theme.palette.mode === 'dark' ? '#10B981' : '#059669',
            transform: 'translateY(-2px)',
            boxShadow: (theme) =>
              theme.palette.mode === 'dark'
                ? '0 4px 12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(16, 185, 129, 0.2)'
                : '0 4px 12px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(5, 150, 105, 0.15)',
          },
        }}
        onMouseEnter={() => onPhotoHover?.(photo)}
        onMouseLeave={() => onPhotoHover?.(null)}
      >
        {/* Image container - aspect-[4/3] for wider, more compact thumbnails */}
        <Box
          onClick={handleThumbnailClick}
          sx={{
            position: "relative",
            width: "100%",
            aspectRatio: "4/3",
            overflow: "hidden",
            cursor: onThumbnailClick ? 'pointer' : 'default',
            bgcolor: (theme) => theme.palette.mode === 'dark' ? '#000' : '#f1f5f9',
          }}
        >
          <LazyImage 
            src={thumbnailUrl} 
            alt={photo.IMAGE_NAME} 
            height="100%"
            sx={{
              width: "100%",
              height: "100%",
              "& img": {
                objectFit: "cover",
              },
            }}
          />

          {/* Selection checkbox - top-left */}
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
                zIndex: 3,
                cursor: 'pointer',
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(0,0,0,0.7)"
                    : "rgba(255,255,255,0.9)",
                borderRadius: 1,
                '&:hover': {
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(0,0,0,0.9)"
                      : "rgba(255,255,255,1)",
                },
              }}
            >
              <Checkbox
                checked={isSelected}
                color="secondary"
                size="small"
                inputProps={{ "aria-label": "Select photo for comparison" }}
              />
            </Box>
          </Tooltip>

          {/* AERIAL/ORTHO chip - next to select button, on top of image */}
          <Box
            sx={{
              position: "absolute",
              top: 6,
              left: 50,
              zIndex: 2,
            }}
          >
            <Chip
              label={LAYER_TYPE_LABELS[photo.layerType]}
              size="small"
              sx={{
                fontSize: '0.65rem',
                height: 22,
                fontWeight: 700,
                letterSpacing: '0.3px',
                bgcolor: (theme) =>
                  theme.palette.mode === "dark"
                    ? "rgba(0,0,0,0.8)"
                    : "rgba(255,255,255,0.98)",
                backdropFilter: "blur(4px)",
                color: (theme) =>
                  theme.palette.mode === "dark"
                    ? "#FFFFFF"
                    : "#000000", // Pure black for maximum contrast in light mode
                border: (theme) =>
                  theme.palette.mode === "dark"
                    ? "none"
                    : "1px solid rgba(0,0,0,0.15)", // Subtle border for definition in light mode
                "& .MuiChip-label": {
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "#FFFFFF"
                      : "#000000", // Ensure label text is always high contrast
                  fontWeight: 700,
                },
              }}
            />
          </Box>

          {/* Persistent action row - bottom-right */}
          <Box
            sx={{
              position: "absolute",
              bottom: 8,
              right: 8,
              zIndex: 2,
              display: "flex",
              gap: 1.5,
              alignItems: "center",
            }}
          >
            <Tooltip title="Preview image" arrow placement="top">
              <IconButton
                size="small"
                onClick={handleViewImage}
                disabled={!photo.DOWNLOAD_LINK}
                aria-label="Preview image"
                sx={{
                  minWidth: { xs: 44, md: 32 },
                  minHeight: { xs: 44, md: 32 },
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(0,0,0,0.7)"
                      : "rgba(255,255,255,0.95)",
                  backdropFilter: "blur(4px)",
                  color: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(255,255,255,0.9)"
                      : "rgba(0,0,0,0.85)",
                  opacity: 0.85,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    opacity: 1,
                    transform: 'scale(1.1)',
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(0,0,0,0.9)"
                        : "rgba(255,255,255,1)",
                    color: (theme) =>
                      theme.palette.mode === "dark"
                        ? "#FFFFFF"
                        : "#000000",
                  },
                }}
              >
                <Visibility sx={{ fontSize: { xs: 20, md: 16 } }} />
              </IconButton>
            </Tooltip>

            {photo.DOWNLOAD_LINK && (
              <Tooltip title="Download TIFF" arrow placement="top">
                <IconButton
                  size="small"
                  onClick={handleDownload}
                  disabled={downloading}
                  aria-label="Download TIFF"
                  sx={{
                    minWidth: { xs: 44, md: 32 },
                    minHeight: { xs: 44, md: 32 },
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(0,0,0,0.7)"
                        : "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(4px)",
                    color: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.85)",
                    opacity: 0.85,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      opacity: 1,
                      transform: 'scale(1.1)',
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(0,0,0,0.9)"
                          : "rgba(255,255,255,1)",
                      color: (theme) =>
                        theme.palette.mode === "dark"
                          ? "#FFFFFF"
                          : "#000000",
                    },
                  }}
                >
                  {downloading ? (
                    <CircularProgress size={16} color="secondary" />
                  ) : (
                    <Download sx={{ fontSize: { xs: 20, md: 16 } }} />
                  )}
                </IconButton>
              </Tooltip>
            )}

            {onFavorite && (
              <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"} arrow placement="top">
                <IconButton
                  size="small"
                  onClick={handleFavorite}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  sx={{
                    minWidth: { xs: 44, md: 32 },
                    minHeight: { xs: 44, md: 32 },
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(0,0,0,0.7)"
                        : "rgba(255,255,255,0.95)",
                    backdropFilter: "blur(4px)",
                    color: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.9)"
                        : "rgba(0,0,0,0.85)",
                    opacity: isFavorite ? 1 : 0.85,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      opacity: 1,
                      transform: 'scale(1.1)',
                      bgcolor: (theme) =>
                        theme.palette.mode === "dark"
                          ? "rgba(0,0,0,0.9)"
                          : "rgba(255,255,255,1)",
                      color: (theme) =>
                        theme.palette.mode === "dark"
                          ? "#FFFFFF"
                          : "#000000",
                    },
                  }}
                >
                  {isFavorite ? (
                    <Favorite sx={{ fontSize: { xs: 20, md: 16 }, color: 'error.main' }} />
                  ) : (
                    <FavoriteBorder sx={{ fontSize: { xs: 20, md: 16 } }} />
                  )}
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Bottom metadata - date and scale */}
        <Box
          sx={{
            px: 1,
            py: 0.75,
            display: "flex",
            flexDirection: "column",
            gap: 0.25,
          }}
        >
          <Typography
            variant="body2"
            component="div"
            sx={{
              fontSize: "0.8125rem",
              fontWeight: 500,
              lineHeight: 1.3,
              color: (theme) =>
                theme.palette.mode === 'dark' ? '#EAEAEA' : '#111827', // textPrimary
            }}
          >
            {photo.dateFormatted || "Unknown Date"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: "0.75rem",
              fontWeight: 400,
              color: (theme) =>
                theme.palette.mode === 'dark' ? '#B4B4B4' : '#6B7280', // textSecondary
            }}
          >
            {photo.scaleFormatted || "N/A"}
          </Typography>
          {photo.DOWNLOAD_LINK && (
            <Link
              href={photo.DOWNLOAD_LINK}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={{
                fontSize: "0.75rem",
                fontWeight: 500,
                color: (theme) =>
                  theme.palette.mode === 'dark' ? '#10B981' : '#059669', // accent
                textDecoration: "none",
                mt: 0.25,
                display: "inline-block",
                transition: 'all 0.2s ease',
                "&:hover": {
                  textDecoration: "underline",
                  color: (theme) =>
                    theme.palette.mode === 'dark' ? '#34D399' : '#047857', // accentHover
                },
              }}
            >
              Download TIFF
            </Link>
          )}
        </Box>
      </Card>
    </>
  );
}

export default memo(PhotoCard);

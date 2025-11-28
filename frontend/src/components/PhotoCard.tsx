import { memo, useState } from "react";
import {
  Card,
  Typography,
  Chip,
  IconButton,
  Box,
  Tooltip,
  Checkbox,
  Link,
} from "@mui/material";
import {
  Favorite,
  FavoriteBorder,
  Visibility,
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
              bottom: { xs: 6, md: 8 },
              right: { xs: 6, md: 8 },
              zIndex: 2,
              display: "flex",
              gap: { xs: 0.75, md: 1.5 },
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
                  width: { xs: 32, md: 32 },
                  height: { xs: 32, md: 32 },
                  padding: { xs: 0.5, md: 0 },
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark"
                      ? "rgba(37, 99, 235, 0.8)"
                      : "rgba(59, 130, 246, 0.9)",
                  backdropFilter: "blur(4px)",
                  color: "white",
                  opacity: 0.9,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    opacity: 1,
                    transform: 'scale(1.1)',
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(37, 99, 235, 1)"
                        : "rgba(59, 130, 246, 1)",
                  },
                  '&:disabled': {
                    opacity: 0.5,
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(0,0,0,0.5)"
                        : "rgba(255,255,255,0.5)",
                    color: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(255,255,255,0.5)"
                        : "rgba(0,0,0,0.5)",
                  },
                }}
              >
                <Visibility sx={{ fontSize: { xs: 16, md: 16 } }} />
              </IconButton>
            </Tooltip>

            {onFavorite && (
              <Tooltip title={isFavorite ? "Remove from favorites" : "Add to favorites"} arrow placement="top">
                <IconButton
                  size="small"
                  onClick={handleFavorite}
                  aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  sx={{
                    width: { xs: 32, md: 32 },
                    height: { xs: 32, md: 32 },
                    padding: { xs: 0.5, md: 0 },
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
                    <Favorite sx={{ fontSize: { xs: 16, md: 16 }, color: 'error.main' }} />
                  ) : (
                    <FavoriteBorder sx={{ fontSize: { xs: 16, md: 16 } }} />
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

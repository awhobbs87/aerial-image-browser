import { useMemo, useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Alert,
} from "@mui/material";
import {
  Timeline as TimelineIcon,
  CalendarMonth,
  Favorite,
  FavoriteBorder,
  Map as MapIcon,
  Visibility,
  Navigation,
} from "@mui/icons-material";
import { Checkbox } from "@mui/material";
import type { EnhancedPhoto } from "../types/api";
import apiClient from "../lib/apiClient";
import LazyImage from "./LazyImage";
import PhotoPreviewModal from "./PhotoPreviewModal";

interface PhotoTimelineProps {
  photos: EnhancedPhoto[];
  loading?: boolean;
  error?: Error | null;
  onFavorite?: (photo: EnhancedPhoto) => void;
  onShowOnMap?: (photo: EnhancedPhoto) => void;
  onPhotoHover?: (photo: EnhancedPhoto | null) => void;
  favorites?: Set<string>;
  selection?: Set<string>;
  onToggleSelect?: (photo: EnhancedPhoto) => void;
}

interface TimelineItemProps {
  photo: EnhancedPhoto;
  onFavorite?: (photo: EnhancedPhoto) => void;
  onShowOnMap?: (photo: EnhancedPhoto) => void;
  onPhotoHover?: (photo: EnhancedPhoto | null) => void;
  isFavorite: boolean;
  onToggleSelect?: (photo: EnhancedPhoto) => void;
  isSelected: boolean;
}

function TimelineItem({
  photo,
  onFavorite,
  onShowOnMap,
  onPhotoHover,
  isFavorite,
  onToggleSelect,
  isSelected,
}: TimelineItemProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const thumbnailUrl = apiClient.getOptimizedImageUrl(photo.IMAGE_NAME, photo.layerId, {
    width: 600,
    format: "webp",
  });

  return (
    <>
      <PhotoPreviewModal photo={photo} open={previewOpen} onClose={() => setPreviewOpen(false)} />
      <Paper
        elevation={2}
        sx={{
          p: 2,
          borderRadius: 3,
          borderLeft: (theme) => `4px solid ${theme.palette.primary.main}`,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, rgba(0,0,0,0.35) 0%, rgba(33, 33, 33, 0.8) 100%)"
              : "linear-gradient(135deg, #f8fafc 0%, #edf2f7 100%)",
        }}
        onMouseEnter={() => onPhotoHover?.(photo)}
        onMouseLeave={() => onPhotoHover?.(null)}
      >
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <Box
            sx={{
              width: { xs: "100%", sm: 200 },
              height: { xs: 150, sm: 140 },
              borderRadius: 2,
              overflow: "hidden",
              boxShadow: 2,
              position: "relative",
              flexShrink: 0,
            }}
            onClick={() => setPreviewOpen(true)}
          >
            <LazyImage src={thumbnailUrl} alt={photo.IMAGE_NAME} height={160} />
            <Box
              sx={{
                position: "absolute",
                bottom: 8,
                left: 8,
                bgcolor: "rgba(0,0,0,0.6)",
                color: "white",
                px: 1.5,
                py: 0.25,
                borderRadius: 2,
                fontSize: "0.7rem",
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <TimelineIcon sx={{ fontSize: 14 }} />
              {photo.layerType.toUpperCase()}
            </Box>
          </Box>

          <Stack spacing={1} sx={{ flexGrow: 1 }}>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              <Chip
                icon={<CalendarMonth sx={{ fontSize: 16 }} />}
                label={photo.dateFormatted || "Unknown Date"}
                size="small"
                color="primary"
                sx={{ fontWeight: 600 }}
              />
              {photo.scaleFormatted && (
                <Chip label={photo.scaleFormatted} variant="outlined" size="small" sx={{ fontWeight: 500 }} />
              )}
              <Chip
                label={photo.IMAGE_TYPE?.toUpperCase() || "UNKNOWN"}
                size="small"
                variant="outlined"
                sx={{ fontWeight: 500 }}
              />
            </Box>

            <Typography variant="h6" sx={{ fontSize: "1rem", fontWeight: 700 }}>
              {photo.PROJ_NAME || photo.IMAGE_NAME}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 480, textOverflow: "ellipsis", overflow: "hidden" }}
            >
              {photo.FILM_NO && `Film ${photo.FILM_NO}`} {photo.FRAME && ` • Frame ${photo.FRAME}`}{" "}
              {photo.RUN_NO && ` • Run ${photo.RUN_NO}`}
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              <Tooltip
                title={
                  isSelected
                    ? "Selected for comparison / then vs now"
                    : "Select for comparison (up to two) or Then vs Now (single photo)"
                }
                arrow
              >
                <Checkbox
                  checked={isSelected}
                  onChange={() => onToggleSelect?.(photo)}
                  size="small"
                  color="secondary"
                  sx={{
                    bgcolor: (theme) =>
                      theme.palette.mode === "dark"
                        ? "rgba(0,0,0,0.4)"
                        : "rgba(255,255,255,0.6)",
                    borderRadius: 1,
                  }}
                />
              </Tooltip>
              <Tooltip title="Preview image in modal" arrow>
                <IconButton color="primary" size="small" onClick={() => setPreviewOpen(true)}>
                  <Visibility />
                </IconButton>
              </Tooltip>

              {onShowOnMap && photo.geometry && (
                <Tooltip title="Show on map" arrow>
                  <IconButton color="primary" size="small" onClick={() => onShowOnMap(photo)}>
                    <MapIcon />
                  </IconButton>
                </Tooltip>
              )}

              {onFavorite && (
                <Tooltip
                  title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                  arrow
                >
                  <IconButton color="error" size="small" onClick={() => onFavorite(photo)}>
                    {isFavorite ? <Favorite /> : <FavoriteBorder />}
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Stack>
        </Stack>
      </Paper>
    </>
  );
}

export default function PhotoTimeline({
  photos,
  loading = false,
  error = null,
  onFavorite,
  onShowOnMap,
  onPhotoHover,
  favorites = new Set(),
  selection = new Set(),
  onToggleSelect,
}: PhotoTimelineProps) {
  const yearRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [focusedYear, setFocusedYear] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const withDate = [...photos].map((photo) => {
      if (!photo.FLY_DATE) {
        return { year: "Unknown", photo, timestamp: 0 };
      }
      const date = new Date(photo.FLY_DATE);
      return { year: date.getFullYear().toString(), photo, timestamp: date.getTime() };
    });

    const sorted = withDate.sort((a, b) => a.timestamp - b.timestamp);
    return sorted.reduce<Record<string, EnhancedPhoto[]>>((acc, item) => {
      if (!acc[item.year]) acc[item.year] = [];
      acc[item.year].push(item.photo);
      return acc;
    }, {});
  }, [photos]);

  const years = useMemo(() => Object.keys(grouped).sort((a, b) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return Number(a) - Number(b);
  }), [grouped]);

  const handleScrollToYear = useCallback((year: string) => {
    const target = yearRefs.current[year];
    if (target) {
      setFocusedYear(year);
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  if (loading) {
    return (
      <Stack spacing={2}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Paper key={`timeline-skeleton-${index}`} sx={{ p: 2, borderRadius: 3 }}>
            <Box sx={{ width: "100%", height: 120, bgcolor: "action.hover", borderRadius: 2 }} />
          </Paper>
        ))}
      </Stack>
    );
  }

  if (error) {
    return (
      <Paper
        elevation={3}
        sx={{
          p: 4,
          textAlign: "center",
          bgcolor: "error.light",
          color: "error.contrastText",
        }}
      >
        <Typography variant="h6" gutterBottom>
          Error loading photos
        </Typography>
        <Typography variant="body2">{error.message}</Typography>
      </Paper>
    );
  }

  if (photos.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 6, textAlign: "center" }}>
        <TimelineIcon sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
        <Typography variant="h5" gutterBottom color="text.secondary">
          No photos found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try adjusting your filters or searching a different location
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ position: "relative", pl: { xs: 2, sm: 4 } }}>
      {years.length > 1 && (
        <Paper
          variant="outlined"
          sx={{
            mb: 3,
            p: 2,
            borderRadius: 3,
            background: (theme) =>
              theme.palette.mode === "dark"
                ? "rgba(0,0,0,0.35)"
                : "rgba(255,255,255,0.8)",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center" mb={1}>
            <Navigation sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="subtitle2" color="text.secondary">
              Jump to year
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              overflowX: "auto",
              pb: 1,
            }}
          >
            {years.map((year) => (
              <Chip
                key={`nav-${year}`}
                label={year}
                variant={focusedYear === year ? "filled" : "outlined"}
                color={focusedYear === year ? "primary" : "default"}
                disabled={year === "Unknown"}
                onClick={() => handleScrollToYear(year)}
                size="small"
              />
            ))}
          </Box>
        </Paper>
      )}

      <Box
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: { xs: 10, sm: 16 },
          width: 2,
          bgcolor: "divider",
        }}
      />
      <Stack spacing={3}>
        {years.map((year) => (
          <Box
            key={year}
            id={`timeline-year-${year}`}
            ref={(el) => {
              yearRefs.current[year] = el;
            }}
            sx={{ position: "relative", pl: { xs: 2, sm: 4 } }}
          >
            <Chip
              label={year}
              color="primary"
              variant="outlined"
              sx={{
                mb: 2,
                fontWeight: 700,
                position: "relative",
                zIndex: 1,
              }}
            />
            <Stack spacing={2}>
              {grouped[year].map((photo) => (
                <TimelineItem
                  key={`${photo.layerId}-${photo.OBJECTID}`}
                  photo={photo}
                  onFavorite={onFavorite}
                  onShowOnMap={onShowOnMap}
                  onPhotoHover={onPhotoHover}
                  isFavorite={favorites.has(`${photo.layerId}-${photo.OBJECTID}`)}
                  onToggleSelect={onToggleSelect}
                  isSelected={selection.has(`${photo.layerId}-${photo.OBJECTID}`)}
                />
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Alert
        severity="info"
        sx={{
          mt: 4,
          borderRadius: 3,
          border: (theme) =>
            theme.palette.mode === "dark"
              ? "1px solid rgba(255, 255, 255, 0.12)"
              : "1px solid rgba(0, 0, 0, 0.08)",
        }}
      >
        Use the compare toggle on any photo to add it to the comparison modal.
      </Alert>
    </Box>
  );
}

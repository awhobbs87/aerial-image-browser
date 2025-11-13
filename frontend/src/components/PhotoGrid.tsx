import { useState, useMemo } from "react";
import {
  Typography,
  Box,
  Pagination,
  Paper,
  CircularProgress,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
} from "@mui/material";
import {
  Image as ImageIcon,
  SortByAlpha,
  ExpandMore,
  ViewModule,
  ViewList,
} from "@mui/icons-material";
import PhotoCard from "./PhotoCard";
import type { EnhancedPhoto } from "../types/api";

interface PhotoGridProps {
  photos: EnhancedPhoto[];
  loading?: boolean;
  error?: Error | null;
  onFavorite?: (photo: EnhancedPhoto) => void;
  onShowOnMap?: (photo: EnhancedPhoto) => void;
  onPhotoHover?: (photo: EnhancedPhoto | null) => void;
  favorites?: Set<string>;
}

const PHOTOS_PER_PAGE = 12;

type SortOrder = "newest" | "oldest";
type GroupBy = "none" | "year" | "decade";

export default function PhotoGrid({
  photos,
  loading = false,
  error = null,
  onFavorite,
  onShowOnMap,
  onPhotoHover,
  favorites = new Set(),
}: PhotoGridProps) {
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Sort and group photos
  const processedPhotos = useMemo(() => {
    // Sort photos
    const sorted = [...photos].sort((a, b) => {
      const dateA = a.FLY_DATE || 0;
      const dateB = b.FLY_DATE || 0;
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    // Group photos if needed
    if (groupBy === "none") {
      return { ungrouped: sorted };
    }

    const grouped: Record<string, EnhancedPhoto[]> = {};

    sorted.forEach((photo) => {
      if (!photo.FLY_DATE) {
        if (!grouped["Unknown"]) grouped["Unknown"] = [];
        grouped["Unknown"].push(photo);
        return;
      }

      const date = new Date(photo.FLY_DATE);
      const year = date.getFullYear();
      let key: string;

      if (groupBy === "year") {
        key = year.toString();
      } else {
        // decade
        const decade = Math.floor(year / 10) * 10;
        key = `${decade}s`;
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(photo);
    });

    return grouped;
  }, [photos, sortOrder, groupBy]);

  // Calculate pagination
  const allPhotos = groupBy === "none" ? processedPhotos.ungrouped || [] : Object.values(processedPhotos).flat();
  const totalPages = Math.ceil(allPhotos.length / PHOTOS_PER_PAGE);
  const startIndex = (page - 1) * PHOTOS_PER_PAGE;
  const endIndex = startIndex + PHOTOS_PER_PAGE;

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Box sx={{ textAlign: "center" }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2, color: "text.secondary" }}>
            Searching for photos...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
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

  // Empty state
  if (photos.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 6, textAlign: "center" }}>
        <ImageIcon sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
        <Typography variant="h5" gutterBottom color="text.secondary">
          No photos found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Try searching a different location or adjusting your search criteria
        </Typography>
      </Paper>
    );
  }

  // Render grouped or ungrouped results
  const renderPhotos = () => {
    if (groupBy === "none") {
      const currentPhotos = allPhotos.slice(startIndex, endIndex);
      return (
        <Grid container spacing={3}>
          {currentPhotos.map((photo) => (
            <Grid item key={`${photo.layerId}-${photo.OBJECTID}`} xs={12} sm={6} lg={12}>
              <PhotoCard
                photo={photo}
                onFavorite={onFavorite}
                onShowOnMap={onShowOnMap}
                onPhotoHover={onPhotoHover}
                isFavorite={favorites.has(`${photo.layerId}-${photo.OBJECTID}`)}
              />
            </Grid>
          ))}
        </Grid>
      );
    }

    // Render grouped photos
    const groupKeys = Object.keys(processedPhotos).sort((a, b) => {
      if (a === "Unknown") return 1;
      if (b === "Unknown") return -1;
      return sortOrder === "newest" ? b.localeCompare(a) : a.localeCompare(b);
    });

    return (
      <Stack spacing={2}>
        {groupKeys.map((groupKey) => {
          const groupPhotos = processedPhotos[groupKey];
          return (
            <Accordion key={groupKey} defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Typography variant="h6">{groupKey}</Typography>
                  <Chip label={`${groupPhotos.length} photos`} size="small" color="primary" />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={3}>
                  {groupPhotos.map((photo) => (
                    <Grid
                      item
                      key={`${photo.layerId}-${photo.OBJECTID}`}
                      xs={12}
                      sm={6}
                      lg={12}
                    >
                      <PhotoCard
                        photo={photo}
                        onFavorite={onFavorite}
                        onShowOnMap={onShowOnMap}
                        onPhotoHover={onPhotoHover}
                        isFavorite={favorites.has(`${photo.layerId}-${photo.OBJECTID}`)}
                      />
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    );
  };

  return (
    <Box>
      {/* Results header with controls */}
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          mb: 2,
          background: (theme) =>
            theme.palette.mode === "dark"
              ? "linear-gradient(135deg, #2d3748 0%, #1a202c 100%)"
              : "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
        }}
      >
        <Stack spacing={1.25}>
          {/* Header with count and pagination */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Chip
              label={`${photos.length} photo${photos.length !== 1 ? "s" : ""}`}
              color="primary"
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: "0.8rem",
                height: 28,
              }}
            />
            {groupBy === "none" && totalPages > 1 && (
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                Page {page} of {totalPages}
              </Typography>
            )}
          </Box>

          {/* Compact Sort and Group Controls */}
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, display: "block", fontSize: "0.7rem", fontWeight: 600 }}>
                SORT
              </Typography>
              <ToggleButtonGroup
                value={sortOrder}
                exclusive
                onChange={(_e, value) => value && setSortOrder(value)}
                size="small"
                sx={{ height: 28 }}
              >
                <ToggleButton value="newest" sx={{ px: 1, fontSize: "0.7rem", textTransform: "none" }}>
                  Newest
                </ToggleButton>
                <ToggleButton value="oldest" sx={{ px: 1, fontSize: "0.7rem", textTransform: "none" }}>
                  Oldest
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.25, display: "block", fontSize: "0.7rem", fontWeight: 600 }}>
                GROUP
              </Typography>
              <ToggleButtonGroup
                value={groupBy}
                exclusive
                onChange={(_e, value) => {
                  if (value) {
                    setGroupBy(value);
                    setPage(1);
                  }
                }}
                size="small"
                sx={{ height: 28 }}
              >
                <ToggleButton value="none" sx={{ px: 1, fontSize: "0.7rem", textTransform: "none" }}>
                  <ViewModule sx={{ mr: 0.5, fontSize: 16 }} />
                  None
                </ToggleButton>
                <ToggleButton value="year" sx={{ px: 1, fontSize: "0.7rem", textTransform: "none" }}>
                  Year
                </ToggleButton>
                <ToggleButton value="decade" sx={{ px: 1, fontSize: "0.7rem", textTransform: "none" }}>
                  Decade
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Stack>
      </Paper>

      {/* Photo grid or grouped display */}
      {renderPhotos()}

      {/* Pagination (only for ungrouped) */}
      {groupBy === "none" && totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
}

import { useState } from "react";
import { Typography, Box, Pagination, Paper, CircularProgress, Grid } from "@mui/material";
import { Image as ImageIcon } from "@mui/icons-material";
import PhotoCard from "./PhotoCard";
import type { EnhancedPhoto } from "../types/api";

interface PhotoGridProps {
  photos: EnhancedPhoto[];
  loading?: boolean;
  error?: Error | null;
  onFavorite?: (photo: EnhancedPhoto) => void;
  onShowOnMap?: (photo: EnhancedPhoto) => void;
  favorites?: Set<string>;
}

const PHOTOS_PER_PAGE = 12;

export default function PhotoGrid({
  photos,
  loading = false,
  error = null,
  onFavorite,
  onShowOnMap,
  favorites = new Set(),
}: PhotoGridProps) {
  const [page, setPage] = useState(1);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate pagination
  const totalPages = Math.ceil(photos.length / PHOTOS_PER_PAGE);
  const startIndex = (page - 1) * PHOTOS_PER_PAGE;
  const endIndex = startIndex + PHOTOS_PER_PAGE;
  const currentPhotos = photos.slice(startIndex, endIndex);

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

  return (
    <Box>
      {/* Results header */}
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Found {photos.length} photo{photos.length !== 1 ? "s" : ""}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Page {page} of {totalPages}
        </Typography>
      </Box>

      {/* Photo grid */}
      <Grid container spacing={3}>
        {currentPhotos.map((photo) => (
          <Grid item key={`${photo.layerId}-${photo.OBJECTID}`} xs={12} sm={6} md={4} lg={3}>
            <PhotoCard
              photo={photo}
              onFavorite={onFavorite}
              onShowOnMap={onShowOnMap}
              isFavorite={favorites.has(`${photo.layerId}-${photo.OBJECTID}`)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
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

import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography, Button } from "@mui/material";
import { Close, DeleteSweep, Favorite } from "@mui/icons-material";
import PhotoCard from "./PhotoCard";
import type { EnhancedPhoto } from "../types/api";

interface FavoritesModalProps {
  open: boolean;
  onClose: () => void;
  favoritePhotos: EnhancedPhoto[];
  favorites: Set<string>;
  onFavorite?: (photo: EnhancedPhoto) => void;
  onShowOnMap?: (photo: EnhancedPhoto) => void;
  onClearAll?: () => void;
}

export default function FavoritesModal({
  open,
  onClose,
  favoritePhotos,
  favorites,
  onFavorite,
  onShowOnMap,
  onClearAll,
}: FavoritesModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Favorite color="error" />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Favorites ({favoritePhotos.length})
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {favoritePhotos.length > 0 && onClearAll && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<DeleteSweep />}
              onClick={onClearAll}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Clear All
            </Button>
          )}
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {favoritePhotos.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 12,
              px: 4,
            }}
          >
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(244, 63, 94, 0.1)'
                    : 'rgba(244, 63, 94, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 3,
              }}
            >
              <Favorite sx={{ fontSize: 40, color: 'error.main', opacity: 0.6 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
              No favorites yet
            </Typography>
            <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ maxWidth: 400 }}>
              Click the heart icon on any photo to add it to your favorites and access them quickly here
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 2,
            }}
          >
            {favoritePhotos.map((photo) => (
              <PhotoCard
                key={`${photo.layerId}-${photo.OBJECTID}`}
                photo={photo}
                onFavorite={onFavorite}
                onShowOnMap={onShowOnMap}
                isFavorite={favorites.has(`${photo.layerId}-${photo.OBJECTID}`)}
              />
            ))}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

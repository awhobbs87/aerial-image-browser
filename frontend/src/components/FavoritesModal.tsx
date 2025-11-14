import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";
import PhotoCard from "./PhotoCard";
import type { EnhancedPhoto } from "../types/api";

interface FavoritesModalProps {
  open: boolean;
  onClose: () => void;
  favoritePhotos: EnhancedPhoto[];
  favorites: Set<string>;
  onFavorite?: (photo: EnhancedPhoto) => void;
  onShowOnMap?: (photo: EnhancedPhoto) => void;
}

export default function FavoritesModal({
  open,
  onClose,
  favoritePhotos,
  favorites,
  onFavorite,
  onShowOnMap,
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
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Favorites ({favoritePhotos.length})
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {favoritePhotos.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 8,
            }}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No favorites yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Click the heart icon on any photo to add it to your favorites
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

import { memo, useMemo } from 'react';
import { Polygon, Popup } from 'react-leaflet';
import { Typography, Box, Chip, Stack, Alert, Button } from '@mui/material';
import { Visibility } from '@mui/icons-material';
import apiClient from '../lib/apiClient';
import type { EnhancedPhoto, LayerType } from '../types/api';

interface PhotoMarkersProps {
  photos: EnhancedPhoto[];
  selectedPhoto?: EnhancedPhoto | null;
  hoveredPhoto?: EnhancedPhoto | null;
  onPhotoClick?: (photo: EnhancedPhoto) => void;
}

// Invisible by default - only visible on hover or when selected
const LAYER_COLORS: Record<
  LayerType,
  { color: string; fillColor: string; fillOpacity: number; weight: number; opacity: number }
> = {
  aerial: {
    color: '#4c51bf',
    fillColor: '#667eea',
    fillOpacity: 0,
    weight: 0, // Completely invisible borders by default
    opacity: 0, // Hide borders completely
  },
  ortho: {
    color: '#2f855a',
    fillColor: '#48bb78',
    fillOpacity: 0,
    weight: 0,
    opacity: 0,
  },
  digital: {
    color: '#c53030',
    fillColor: '#f56565',
    fillOpacity: 0,
    weight: 0,
    opacity: 0,
  },
};

// Selected photo styling - slightly more visible but still subtle
const SELECTED_STYLE = {
  color: '#d69e2e', // Gold border
  fillColor: '#ecc94b', // Lighter gold fill
  fillOpacity: 0.08, // Very subtle fill
  weight: 2,
};

// Hovered photo styling - more prominent
const HOVER_STYLE = {
  color: '#3b82f6', // Blue border
  fillColor: '#60a5fa', // Lighter blue fill
  fillOpacity: 0.15, // More visible
  weight: 3,
};

const MAX_POLYGONS = 100;

function PhotoMarkers({ photos, selectedPhoto, hoveredPhoto, onPhotoClick }: PhotoMarkersProps) {
  // Filter photos with valid geometry and prioritize important ones
  const validPhotos = useMemo(() => {
    return photos.filter((photo) => photo.geometry?.rings && Array.isArray(photo.geometry.rings));
  }, [photos]);

  // Prioritize photos: selected > hovered > others
  const prioritizedPhotos = useMemo(() => {
    const selected = selectedPhoto
      ? validPhotos.find(
          (p) => p.OBJECTID === selectedPhoto.OBJECTID && p.layerId === selectedPhoto.layerId
        )
      : null;
    const hovered = hoveredPhoto
      ? validPhotos.find(
          (p) => p.OBJECTID === hoveredPhoto.OBJECTID && p.layerId === hoveredPhoto.layerId
        )
      : null;

    const others = validPhotos.filter(
      (p) =>
        !(
          (selected && p.OBJECTID === selected.OBJECTID && p.layerId === selected.layerId) ||
          (hovered && p.OBJECTID === hovered.OBJECTID && p.layerId === hovered.layerId)
        )
    );

    const prioritized: typeof validPhotos = [];
    if (selected) prioritized.push(selected);
    if (hovered && hovered !== selected) prioritized.push(hovered);
    prioritized.push(...others);

    return prioritized.slice(0, MAX_POLYGONS);
  }, [validPhotos, selectedPhoto, hoveredPhoto]);

  const limitedPhotos = prioritizedPhotos;

  const isLimited = validPhotos.length > MAX_POLYGONS;

  // Memoize polygon data calculations
  const polygonData = useMemo(() => {
    return limitedPhotos.map((photo) => {
      const isSelected = selectedPhoto?.OBJECTID === photo.OBJECTID && selectedPhoto?.layerId === photo.layerId;
      const isHovered = hoveredPhoto?.OBJECTID === photo.OBJECTID && hoveredPhoto?.layerId === photo.layerId;
      const colorConfig = LAYER_COLORS[photo.layerType];
      const styleToUse = isHovered ? HOVER_STYLE : isSelected ? SELECTED_STYLE : null;
      
      // Convert ArcGIS rings to Leaflet polygon positions
      // ArcGIS format: [[[lon, lat], [lon, lat], ...]]
      // Leaflet format: [[lat, lon], [lat, lon], ...]
      const positions = photo.geometry.rings[0].map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]);

      return {
        photo,
        positions,
        isSelected,
        isHovered,
        colorConfig,
        styleToUse,
      };
    });
  }, [limitedPhotos, selectedPhoto, hoveredPhoto]);

  return (
    <>
      {validPhotos.length > MAX_POLYGONS && (
        <Alert
          severity="info"
          sx={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            zIndex: 1000,
            maxWidth: 400,
            boxShadow: 2,
          }}
        >
          Showing {MAX_POLYGONS} of {validPhotos.length} photos (prioritizing selected/hovered)
        </Alert>
      )}
      {polygonData.map(({ photo, positions, isSelected, colorConfig, styleToUse }) => (
          <Polygon
            key={`${photo.layerId}-${photo.OBJECTID}`}
            positions={positions}
            pathOptions={{
              color: styleToUse ? styleToUse.color : colorConfig.color,
              fillColor: styleToUse ? styleToUse.fillColor : colorConfig.fillColor,
              fillOpacity: styleToUse ? styleToUse.fillOpacity : colorConfig.fillOpacity,
              weight: styleToUse ? styleToUse.weight : colorConfig.weight,
              opacity: styleToUse ? 1 : colorConfig.opacity,
            }}
            eventHandlers={{
              click: () => {
                if (onPhotoClick) {
                  onPhotoClick(photo);
                }
              },
              mouseover: (e) => {
                const layer = e.target;
                if (!isSelected) {
                  layer.setStyle({
                    weight: 2,
                    opacity: 0.6,
                    fillOpacity: 0.05,
                  });
                }
              },
              mouseout: (e) => {
                const layer = e.target;
                if (!isSelected) {
                  layer.setStyle({
                    weight: colorConfig.weight,
                    opacity: colorConfig.opacity,
                    fillOpacity: colorConfig.fillOpacity,
                  });
                }
              },
            }}
          >
            <Popup>
              <Box sx={{ minWidth: 200, maxWidth: 300 }}>
                <Stack spacing={1.5}>
                  {/* Thumbnail */}
                  <Box
                    component="img"
                    src={apiClient.getThumbnailUrl(photo.IMAGE_NAME, photo.layerId)}
                    alt={photo.IMAGE_NAME}
                    sx={{
                      width: '100%',
                      height: 150,
                      objectFit: 'cover',
                      borderRadius: 1,
                      bgcolor: 'grey.200',
                    }}
                    loading="lazy"
                  />

                  <Box>
                    <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5 }}>
                      {photo.IMAGE_NAME}
                    </Typography>
                    <Chip
                      label={photo.layerType.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: colorConfig.color,
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.7rem',
                      }}
                    />
                  </Box>

                  <Stack spacing={0.5}>
                    <Typography variant="body2" fontSize="0.85rem">
                      <strong>Date:</strong> {photo.dateFormatted || 'Unknown'}
                    </Typography>

                    <Typography variant="body2" fontSize="0.85rem">
                      <strong>Scale:</strong> {photo.scaleFormatted || 'N/A'}
                    </Typography>

                    {photo.IMAGE_TYPE && (
                      <Typography variant="body2" fontSize="0.85rem">
                        <strong>Type:</strong> {photo.IMAGE_TYPE}
                      </Typography>
                    )}
                  </Stack>

                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<Visibility />}
                    onClick={() => {
                      if (onPhotoClick) {
                        onPhotoClick(photo);
                      }
                    }}
                    fullWidth
                    sx={{
                      textTransform: 'none',
                      fontWeight: 600,
                    }}
                  >
                    View Details
                  </Button>
                </Stack>
              </Box>
            </Popup>
          </Polygon>
      ))}
    </>
  );
}

// Memoize component to prevent unnecessary re-renders
export default memo(PhotoMarkers, (prevProps, nextProps) => {
  // Only re-render if these props actually change
  return (
    prevProps.photos === nextProps.photos &&
    prevProps.selectedPhoto?.OBJECTID === nextProps.selectedPhoto?.OBJECTID &&
    prevProps.selectedPhoto?.layerId === nextProps.selectedPhoto?.layerId &&
    prevProps.hoveredPhoto?.OBJECTID === nextProps.hoveredPhoto?.OBJECTID &&
    prevProps.hoveredPhoto?.layerId === nextProps.hoveredPhoto?.layerId
  );
});

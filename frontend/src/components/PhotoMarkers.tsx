import { Polygon, Popup } from 'react-leaflet';
import { Typography, Box, Chip, Stack } from '@mui/material';
import type { EnhancedPhoto, LayerType } from '../types/api';

interface PhotoMarkersProps {
  photos: EnhancedPhoto[];
  selectedPhoto?: EnhancedPhoto | null;
  onPhotoClick?: (photo: EnhancedPhoto) => void;
}

// Color mapping for different layer types
const LAYER_COLORS: Record<LayerType, { color: string; fillColor: string; fillOpacity: number }> = {
  aerial: {
    color: '#667eea',
    fillColor: '#667eea',
    fillOpacity: 0.2,
  },
  ortho: {
    color: '#48bb78',
    fillColor: '#48bb78',
    fillOpacity: 0.2,
  },
  digital: {
    color: '#f56565',
    fillColor: '#f56565',
    fillOpacity: 0.2,
  },
};

export default function PhotoMarkers({ photos, selectedPhoto, onPhotoClick }: PhotoMarkersProps) {
  return (
    <>
      {photos.map((photo) => {
        // Check if photo has geometry data
        if (!photo.geometry || !photo.geometry.rings || !Array.isArray(photo.geometry.rings)) {
          return null;
        }

        const isSelected = selectedPhoto?.OBJECTID === photo.OBJECTID && selectedPhoto?.layerId === photo.layerId;
        const colorConfig = LAYER_COLORS[photo.layerType];

        // Convert ArcGIS rings to Leaflet polygon positions
        // ArcGIS format: [[[lon, lat], [lon, lat], ...]]
        // Leaflet format: [[lat, lon], [lat, lon], ...]
        const positions = photo.geometry.rings[0].map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]);

        return (
          <Polygon
            key={`${photo.layerId}-${photo.OBJECTID}`}
            positions={positions}
            pathOptions={{
              color: isSelected ? '#FFD700' : colorConfig.color,
              fillColor: isSelected ? '#FFD700' : colorConfig.fillColor,
              fillOpacity: isSelected ? 0.4 : colorConfig.fillOpacity,
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={{
              click: () => {
                if (onPhotoClick) {
                  onPhotoClick(photo);
                }
              },
            }}
          >
            <Popup>
              <Box sx={{ minWidth: 200, maxWidth: 300 }}>
                <Stack spacing={1}>
                  <Typography variant="subtitle2" fontWeight={600}>
                    {photo.IMAGE_NAME}
                  </Typography>

                  <Box>
                    <Chip
                      label={photo.layerType.toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: colorConfig.color,
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  </Box>

                  <Typography variant="body2">
                    <strong>Date:</strong> {photo.dateFormatted || 'Unknown'}
                  </Typography>

                  <Typography variant="body2">
                    <strong>Scale:</strong> {photo.scaleFormatted || 'N/A'}
                  </Typography>

                  {photo.IMAGE_TYPE && (
                    <Typography variant="body2">
                      <strong>Type:</strong> {photo.IMAGE_TYPE}
                    </Typography>
                  )}

                  {photo.PROJ_NAME && (
                    <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
                      <strong>Project:</strong> {photo.PROJ_NAME}
                    </Typography>
                  )}
                </Stack>
              </Box>
            </Popup>
          </Polygon>
        );
      })}
    </>
  );
}

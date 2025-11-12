import { Polygon, Popup } from 'react-leaflet';
import { Typography, Box, Chip, Stack } from '@mui/material';
import type { EnhancedPhoto, LayerType } from '../types/api';

interface PhotoMarkersProps {
  photos: EnhancedPhoto[];
  selectedPhoto?: EnhancedPhoto | null;
  onPhotoClick?: (photo: EnhancedPhoto) => void;
}

// Enhanced color mapping for different layer types with better contrast and visibility
const LAYER_COLORS: Record<
  LayerType,
  { color: string; fillColor: string; fillOpacity: number; weight: number }
> = {
  aerial: {
    color: '#4c51bf', // Deeper indigo for better contrast
    fillColor: '#667eea',
    fillOpacity: 0.15, // Reduced opacity to see overlapping polygons
    weight: 2,
  },
  ortho: {
    color: '#2f855a', // Deeper green
    fillColor: '#48bb78',
    fillOpacity: 0.15,
    weight: 2,
  },
  digital: {
    color: '#c53030', // Deeper red
    fillColor: '#f56565',
    fillOpacity: 0.15,
    weight: 2,
  },
};

// Selected photo styling
const SELECTED_STYLE = {
  color: '#d69e2e', // Gold border
  fillColor: '#ecc94b', // Lighter gold fill
  fillOpacity: 0.35,
  weight: 3,
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
              color: isSelected ? SELECTED_STYLE.color : colorConfig.color,
              fillColor: isSelected ? SELECTED_STYLE.fillColor : colorConfig.fillColor,
              fillOpacity: isSelected ? SELECTED_STYLE.fillOpacity : colorConfig.fillOpacity,
              weight: isSelected ? SELECTED_STYLE.weight : colorConfig.weight,
              dashArray: isSelected ? undefined : '5, 5', // Dashed lines for unselected polygons
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
                    weight: 3,
                    fillOpacity: 0.3,
                  });
                }
              },
              mouseout: (e) => {
                const layer = e.target;
                if (!isSelected) {
                  layer.setStyle({
                    weight: colorConfig.weight,
                    fillOpacity: colorConfig.fillOpacity,
                  });
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

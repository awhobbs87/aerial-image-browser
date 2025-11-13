import { Polygon, Popup } from 'react-leaflet';
import { Typography, Box, Chip, Stack } from '@mui/material';
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

export default function PhotoMarkers({ photos, selectedPhoto, hoveredPhoto, onPhotoClick }: PhotoMarkersProps) {
  return (
    <>
      {photos.map((photo) => {
        // Check if photo has geometry data
        if (!photo.geometry || !photo.geometry.rings || !Array.isArray(photo.geometry.rings)) {
          return null;
        }

        const isSelected = selectedPhoto?.OBJECTID === photo.OBJECTID && selectedPhoto?.layerId === photo.layerId;
        const isHovered = hoveredPhoto?.OBJECTID === photo.OBJECTID && hoveredPhoto?.layerId === photo.layerId;
        const colorConfig = LAYER_COLORS[photo.layerType];

        // Determine which style to use (priority: hovered > selected > default)
        const styleToUse = isHovered ? HOVER_STYLE : isSelected ? SELECTED_STYLE : null;

        // Convert ArcGIS rings to Leaflet polygon positions
        // ArcGIS format: [[[lon, lat], [lon, lat], ...]]
        // Leaflet format: [[lat, lon], [lat, lon], ...]
        const positions = photo.geometry.rings[0].map(([lon, lat]: [number, number]) => [lat, lon] as [number, number]);

        return (
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

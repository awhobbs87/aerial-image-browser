import { useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { Box } from '@mui/material';
import '../lib/leafletConfig'; // Import to fix marker icons
import PhotoMarkers from './PhotoMarkers';
import type { EnhancedPhoto } from '../types/api';

interface MapViewProps {
  photos: EnhancedPhoto[];
  onMapClick?: (lat: number, lon: number) => void;
  onPhotoClick?: (photo: EnhancedPhoto) => void;
  selectedPhoto?: EnhancedPhoto | null;
  center?: [number, number];
  zoom?: number;
}

// Component to handle map events
function MapEventHandler({ onMapClick }: { onMapClick?: (lat: number, lon: number) => void }) {
  useMapEvents({
    click: (e) => {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

export default function MapView({
  photos,
  onMapClick,
  onPhotoClick,
  selectedPhoto,
  center = [-42.0, 147.0], // Tasmania center
  zoom = 8,
}: MapViewProps) {
  return (
    <Box sx={{ height: '700px', width: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEventHandler onMapClick={onMapClick} />

        {/* Render photo footprints as polygons */}
        {photos.length > 0 && (
          <PhotoMarkers
            photos={photos}
            selectedPhoto={selectedPhoto}
            onPhotoClick={onPhotoClick}
          />
        )}
      </MapContainer>
    </Box>
  );
}

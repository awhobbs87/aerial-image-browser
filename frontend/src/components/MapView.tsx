import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMapEvents, useMap, Marker, Popup } from 'react-leaflet';
import { Box } from '@mui/material';
import { LatLngBounds } from 'leaflet';
import '../lib/leafletConfig'; // Import to fix marker icons
import PhotoMarkers from './PhotoMarkers';
import MapZoomControls from './MapZoomControls';
import type { EnhancedPhoto } from '../types/api';

interface MapViewProps {
  photos: EnhancedPhoto[];
  onMapClick?: (lat: number, lon: number) => void;
  onPhotoClick?: (photo: EnhancedPhoto) => void;
  selectedPhoto?: EnhancedPhoto | null;
  hoveredPhoto?: EnhancedPhoto | null;
  center?: [number, number];
  zoom?: number;
  searchCenter?: [number, number] | null;
  autoZoom?: boolean;
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

// Component to handle auto-zoom and centering
function MapController({
  photos,
  searchCenter,
  autoZoom,
}: {
  photos: EnhancedPhoto[];
  searchCenter?: [number, number] | null;
  autoZoom?: boolean;
}) {
  const map = useMap();

  // Memoize bounds calculation - only recalculate when photos array reference changes
  const bounds = useMemo(() => {
    if (!autoZoom || photos.length === 0) {
      return null;
    }

    const validPhotos = photos.filter((p) => p.geometry?.rings?.[0]);
    if (validPhotos.length === 0) {
      return null;
    }

    const calculatedBounds = new LatLngBounds(
      validPhotos.flatMap((photo) =>
        photo.geometry.rings[0].map(([lon, lat]: [number, number]) => [lat, lon] as [number, number])
      )
    );

    return calculatedBounds.isValid() ? calculatedBounds : null;
  }, [photos, autoZoom]);

  useEffect(() => {
    if (searchCenter) {
      // Center on search location with appropriate zoom
      map.setView(searchCenter, 13, { animate: true });
    } else if (bounds) {
      // Auto-fit bounds to show all photos
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [bounds, searchCenter, map]);

  return null;
}

export default function MapView({
  photos,
  onMapClick,
  onPhotoClick,
  selectedPhoto,
  hoveredPhoto,
  center = [-42.0, 147.0], // Tasmania center
  zoom = 8,
  searchCenter = null,
  autoZoom = true,
}: MapViewProps) {
  return (
    <Box
      sx={{
        height: { xs: '500px', md: '100%' },
        width: '100%',
        position: { xs: 'relative', md: 'absolute' },
        top: { md: 0 },
        left: { md: 0 },
        right: { md: 0 },
        bottom: { md: 0 },
      }}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        {/* Satellite imagery from Esri World Imagery */}
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
        />

        <MapEventHandler onMapClick={onMapClick} />

        <MapController photos={photos} searchCenter={searchCenter} autoZoom={autoZoom} />

        {/* Show search center marker */}
        {searchCenter && (
          <Marker position={searchCenter}>
            <Popup>
              <strong>Search Location</strong>
              <br />
              {searchCenter[0].toFixed(4)}, {searchCenter[1].toFixed(4)}
            </Popup>
          </Marker>
        )}

        {/* Render photo footprints as polygons */}
        {photos.length > 0 && (
          <PhotoMarkers
            photos={photos}
            selectedPhoto={selectedPhoto}
            hoveredPhoto={hoveredPhoto}
            onPhotoClick={onPhotoClick}
          />
        )}

        {/* Mobile zoom controls */}
        <MapZoomControls searchCenter={searchCenter} />
      </MapContainer>
    </Box>
  );
}

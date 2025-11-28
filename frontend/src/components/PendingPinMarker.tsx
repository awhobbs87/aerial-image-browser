import { Circle, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { Box, Typography } from "@mui/material";
import { formatCoordinates } from "../lib/formatCoordinates";

interface PendingPinMarkerProps {
  position: [number, number];
}

// Custom pin icon for pending location
const pendingPinIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

/**
 * PendingPinMarker - Visual indicator for a location selected by the user before searching
 * Displays a red marker with a subtle pulse animation and coordinate information
 */
export default function PendingPinMarker({ position }: PendingPinMarkerProps) {
  const [lat, lon] = position;

  return (
    <>
      {/* Pulsing circle for visual feedback */}
      <Circle
        center={position}
        radius={500}
        pathOptions={{
          color: "#ef4444",
          fillColor: "#ef4444",
          fillOpacity: 0.15,
          weight: 2,
          opacity: 0.6,
        }}
        className="pending-pin-pulse"
      />

      {/* Red marker pin */}
      <Marker position={position} icon={pendingPinIcon}>
        <Popup>
          <Box sx={{ p: 0.5, minWidth: 180 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Selected Location
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatCoordinates(lat, lon)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Click "Search Here" to find photos
            </Typography>
          </Box>
        </Popup>
      </Marker>

      <style>{`
        @keyframes pulse {
          0% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.3;
            transform: scale(1.1);
          }
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
        }

        .pending-pin-pulse {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}

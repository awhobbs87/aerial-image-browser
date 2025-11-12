// Fix Leaflet marker icons with Vite
// This is a known issue with Vite and Leaflet
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Delete the default icon URL getter
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Set new default icon options
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default L;

/**
 * Formatting utilities for coordinates, dates, and scale values.
 */

/** Format a timestamp (milliseconds) to Australian locale date string */
export function formatDate(timestamp?: number | null): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Format a scale number to display string (e.g., 15000 -> "1:15,000") */
export function formatScale(scale?: number | null): string | null {
  if (!scale) return null;
  return `1:${scale.toLocaleString()}`;
}

/** Format coordinates for display */
export function formatCoordinates(lat: number, lon: number, precision = 4): string {
  return `${lat.toFixed(precision)}, ${lon.toFixed(precision)}`;
}

/** Format file size in human-readable units */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/** Get layer type label from layer ID */
export function getLayerTypeLabel(layerId: number): string {
  switch (layerId) {
    case 0: return 'Aerial';
    case 1: return 'Orthophoto';
    case 2: return 'Digital';
    default: return 'Unknown';
  }
}

/** Get layer type from layer ID */
export function getLayerType(layerId: number): 'aerial' | 'ortho' | 'digital' {
  return layerId === 0 ? 'aerial' : layerId === 1 ? 'ortho' : 'digital';
}

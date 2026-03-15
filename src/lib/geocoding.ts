/**
 * Nominatim geocoding service for Tasmania.
 * Searches OpenStreetMap data with Tasmania bounding box bias.
 */

import { TASMANIA_BOUNDS } from '@/types/map';

export interface GeocodingResult {
  placeId: string;
  displayName: string;
  lat: number;
  lon: number;
  type: string;
  importance: number;
  boundingBox: [number, number, number, number]; // [south, north, west, east]
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function geocodeSearch(query: string, limit = 5): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: String(limit),
    addressdetails: '1',
    viewbox: `${TASMANIA_BOUNDS.west},${TASMANIA_BOUNDS.south},${TASMANIA_BOUNDS.east},${TASMANIA_BOUNDS.north}`,
    bounded: '0', // Prefer but don't restrict to viewbox
    countrycodes: 'au',
  });

  const response = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: {
      'User-Agent': 'TasmaniaAerialPhotoExplorer/4.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding failed: ${response.status}`);
  }

  const data = (await response.json()) as Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    importance: number;
    boundingbox: [string, string, string, string];
  }>;

  return data.map((item) => ({
    placeId: String(item.place_id),
    displayName: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    type: item.type,
    importance: item.importance,
    boundingBox: item.boundingbox.map(Number) as [number, number, number, number],
  }));
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodingResult | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lon),
    format: 'json',
    zoom: '14',
  });

  const response = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
    headers: {
      'User-Agent': 'TasmaniaAerialPhotoExplorer/4.0',
    },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    type: string;
    importance: number;
    boundingbox: [string, string, string, string];
  };

  if (!data.place_id) return null;

  return {
    placeId: String(data.place_id),
    displayName: data.display_name,
    lat: parseFloat(data.lat),
    lon: parseFloat(data.lon),
    type: data.type,
    importance: data.importance,
    boundingBox: data.boundingbox.map(Number) as [number, number, number, number],
  };
}

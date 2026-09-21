/**
 * Nominatim geocoding service for Tasmania.
 * Uses authoritative LIST addresses and named places through the application API.
 */

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

export async function geocodeSearch(
  query: string,
  limit = 5,
  signal?: AbortSignal,
): Promise<GeocodingResult[]> {
  const response = await fetch(`/api/geocoding/search?${new URLSearchParams({ q: query })}`, {
    signal,
  });
  if (!response.ok)
    throw new Error('Tasmania location search is temporarily unavailable. Please try again.');
  return ((await response.json()) as GeocodingResult[]).slice(0, limit);
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

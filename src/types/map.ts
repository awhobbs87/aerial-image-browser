/**
 * Map-related types for MapLibre GL integration.
 */

/** Map viewport state */
export interface MapViewport {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bearing: number;
  pitch: number;
}

/** Map bounds (SW, NE corners) */
export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

/** Tasmania default viewport */
export const TASMANIA_DEFAULT_VIEWPORT: MapViewport = {
  center: [146.8, -42.0],
  zoom: 7,
  bearing: 0,
  pitch: 0,
};

/** Tasmania bounding box for geocoding bias */
export const TASMANIA_BOUNDS: MapBounds = {
  north: -39.5,
  south: -44.0,
  east: 149.0,
  west: 143.5,
};

/** Map base style options */
export type MapStyle = "streets" | "satellite" | "terrain";

/** GeoJSON feature for photo footprints */
export interface PhotoFootprintFeature {
  type: "Feature";
  properties: {
    objectId: number;
    layerId: number;
    name: string;
    year: number;
    scale: number;
  };
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
}

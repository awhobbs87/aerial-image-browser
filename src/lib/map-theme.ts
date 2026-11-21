import type { Map, RasterLayerSpecification } from 'maplibre-gl';

// The raster shader interpolates between these endpoints. Reversing them
// darkens the paper background while keeping printed labels light.
export function topographicPaint(dark: boolean): NonNullable<RasterLayerSpecification['paint']> {
  return {
    'raster-brightness-min': dark ? 0.85 : 0,
    'raster-brightness-max': dark ? 0.08 : 1,
    'raster-saturation': dark ? -0.65 : 0,
    'raster-hue-rotate': dark ? 180 : 0,
  };
}

export function applyTopographicTheme(
  map: Pick<Map, 'getLayer' | 'setPaintProperty'>,
  dark: boolean,
) {
  if (!map.getLayer('base-tiles')) return;
  for (const [property, value] of Object.entries(topographicPaint(dark)))
    map.setPaintProperty('base-tiles', property, value);
}

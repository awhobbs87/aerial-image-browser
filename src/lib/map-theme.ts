import type { Map, RasterLayerSpecification } from 'maplibre-gl';

// The raster shader interpolates between these endpoints. Reversing them
// darkens the paper background while keeping printed labels light.
// Desaturate fully before inversion: hue rotation made coloured place names
// muddy and can clip channels. A raised floor preserves faint raster details.
export function topographicPaint(dark: boolean): NonNullable<RasterLayerSpecification['paint']> {
  return {
    'raster-brightness-min': dark ? 1 : 0,
    'raster-brightness-max': dark ? 0.14 : 1,
    'raster-saturation': dark ? -1 : 0,
    'raster-hue-rotate': 0,
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

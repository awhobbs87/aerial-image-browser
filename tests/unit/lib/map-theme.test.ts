import { applyTopographicTheme, topographicPaint } from '@/lib/map-theme';
import type { Map } from 'maplibre-gl';

it('switches only raster paint and restores unmodified colours in light mode', () => {
  const map = {
    getLayer: vi
      .fn<Map['getLayer']>()
      .mockReturnValue({ id: 'base-tiles' } as ReturnType<Map['getLayer']>),
    setPaintProperty: vi.fn<Map['setPaintProperty']>(),
  };
  applyTopographicTheme(map, true);
  expect(map.setPaintProperty).toHaveBeenCalledTimes(4);
  expect(map.setPaintProperty).toHaveBeenCalledWith('base-tiles', 'raster-brightness-max', 0.08);
  map.setPaintProperty.mockClear();
  applyTopographicTheme(map, false);
  for (const [key, value] of Object.entries(topographicPaint(false)))
    expect(map.setPaintProperty).toHaveBeenCalledWith('base-tiles', key, value);
  expect(topographicPaint(false)).toEqual({
    'raster-brightness-min': 0,
    'raster-brightness-max': 1,
    'raster-saturation': 0,
    'raster-hue-rotate': 0,
  });
});

it('waits for the basemap layer when a style is loading', () => {
  const map = {
    getLayer: vi.fn<Map['getLayer']>().mockReturnValue(undefined),
    setPaintProperty: vi.fn<Map['setPaintProperty']>(),
  };
  applyTopographicTheme(map, true);
  expect(map.setPaintProperty).not.toHaveBeenCalled();
});

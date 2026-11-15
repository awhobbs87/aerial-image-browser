import { readExtentParams, writeExtentParams } from '@/lib/search-extent';

const bounds = { west: 147.3, south: -42.9, east: 147.4, north: -42.8 };

it('round trips search and framing extents without JSON punctuation in the URL', () => {
  const params = new URLSearchParams();
  writeExtentParams(params, 'bounds', bounds);
  writeExtentParams(params, 'frame', bounds);
  expect(readExtentParams(params, 'bounds')).toEqual(bounds);
  expect(readExtentParams(params, 'frame')).toEqual(bounds);
  expect(decodeURIComponent(params.toString())).not.toMatch(/[{}":]/);
  expect(params.has('bounds')).toBe(false);
  expect(params.has('frame')).toBe(false);
});

it('reads legacy JSON extents and rewrites them as numeric parameters', () => {
  const legacy = new URLSearchParams({ bounds: JSON.stringify(bounds) });
  const parsed = readExtentParams(legacy, 'bounds');
  expect(parsed).toEqual(bounds);
  const next = new URLSearchParams();
  writeExtentParams(next, 'bounds', parsed!);
  expect(next.get('bounds_west')).toBe('147.3');
  expect(next.has('bounds')).toBe(false);
});

it('rejects incomplete, blank, non-finite and oversized area parameters', () => {
  for (const west of ['', 'Infinity', 'NaN', '140']) {
    const params = new URLSearchParams();
    writeExtentParams(params, 'bounds', bounds);
    params.set('bounds_west', west);
    expect(readExtentParams(params, 'bounds')).toBeUndefined();
  }
  expect(readExtentParams(new URLSearchParams({ bounds_west: '147.3' }), 'bounds')).toBeUndefined();
});

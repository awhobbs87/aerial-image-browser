import type { MapBounds } from '@/types/map';
export function validBounds(value: unknown): value is MapBounds {
  if (!value || typeof value !== 'object') return false;
  const b = value as MapBounds;
  return (
    [b.north, b.south, b.east, b.west].every(Number.isFinite) &&
    b.north > b.south &&
    b.east > b.west &&
    b.north <= 90 &&
    b.south >= -90 &&
    b.west >= -180 &&
    b.east <= 180
  );
}
export function searchableBounds(bounds: MapBounds) {
  return (
    validBounds(bounds) && bounds.east - bounds.west <= 0.2 && bounds.north - bounds.south <= 0.2
  );
}
export function geocodingBounds(box: [number, number, number, number]) {
  const bounds = { south: box[0], north: box[1], west: box[2], east: box[3] };
  return validBounds(bounds) ? bounds : null;
}
export function placeTypeLabel(type: string) {
  return type === 'address'
    ? 'Address'
    : /locality|suburb/i.test(type)
      ? 'Locality'
      : 'Named place';
}

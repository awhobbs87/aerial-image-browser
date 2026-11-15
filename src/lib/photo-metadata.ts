import type { EnhancedPhoto } from '@/types/photo';
export function photoDateOrder(a: EnhancedPhoto, b: EnhancedPhoto, direction: 'asc' | 'desc') {
  const left = a.dateFlown || (a.year ? Date.UTC(a.year, 0, 1) : 0);
  const right = b.dateFlown || (b.year ? Date.UTC(b.year, 0, 1) : 0);
  if (!left) return right ? 1 : 0;
  if (!right) return -1;
  return (left - right) * (direction === 'asc' ? 1 : -1);
}
export function photoDateLabel(photo: EnhancedPhoto) {
  if (photo.dateFlown)
    return new Date(photo.dateFlown).toLocaleDateString('en-AU', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  return photo.year ? `${photo.year} (inferred from survey name)` : 'Date unknown';
}

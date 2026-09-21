import type { EnhancedPhoto } from '@/types/photo';

export const IMAGE_VARIANTS = {
  'card-320': { width: 320, quality: 80 },
  'card-640': { width: 640, quality: 80 },
  'card-960': { width: 960, quality: 80 },
  'preview-1600': { width: 1600, quality: 88 },
  'preview-2400': { width: 2400, quality: 88 },
} as const;
export type ImageVariant = keyof typeof IMAGE_VARIANTS;

export function photoImageUrl(
  photo: Pick<EnhancedPhoto, 'layerId' | 'name'>,
  variant: ImageVariant,
) {
  return `/api/images/thumbnail/${photo.layerId}/${encodeURIComponent(photo.name)}?variant=${variant}`;
}
export function photoCardSources(photo: Pick<EnhancedPhoto, 'layerId' | 'name'>) {
  return ([320, 640, 960] as const)
    .map((width) => `${photoImageUrl(photo, `card-${width}`)} ${width}w`)
    .join(', ');
}

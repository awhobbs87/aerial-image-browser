import type { APIRoute } from 'astro';
import { GET as getImage } from '@/pages/api/images/image/[layerId]/[imageName]';
import { nativeError, parseNativePhotoId } from '@/lib/native-api';

export const GET: APIRoute = async (context) => {
  const photo = parseNativePhotoId(context.params.photoId);
  if (!photo) {
    return nativeError(
      'INVALID_PHOTO_ID',
      'Photo id must use the {layerId}:{imageName} format.',
      400,
    );
  }

  return getImage({
    ...context,
    params: {
      layerId: String(photo.layerId),
      imageName: photo.imageName,
    },
  });
};

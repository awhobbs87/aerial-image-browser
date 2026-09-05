import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { R2Manager } from '@/lib/r2';
import {
  buildNativeTileManifest,
  getNativeApiPrefix,
  nativeError,
  nativeSuccess,
  parseNativePhotoId,
} from '@/lib/native-api';
import { requestNativeTileManifest } from '@/lib/native-tile-service';
import { buildNativeRangeManifestFromTiff } from '@/lib/native-tiff-tiles';
import { resolveNativeTiffOriginUrl } from '@/lib/native-api';

export const GET: APIRoute = async ({ params, url }) => {
  const photo = parseNativePhotoId(params.photoId);
  const apiPrefix = getNativeApiPrefix(url);
  if (!photo) {
    return nativeError(
      'INVALID_PHOTO_ID',
      'Photo id must use the {layerId}:{imageName} format.',
      400,
    );
  }

  const r2 = new R2Manager(env.TIFF_STORAGE, env.THUMBNAIL_STORAGE);
  const generatedManifest = await r2.getTileManifest(photo.imageName, photo.layerId);
  if (generatedManifest) {
    return nativeSuccess(
      await generatedManifest.json(),
      { cache: 'HIT' },
      {
        cacheControl: 'public, max-age=31536000, immutable',
      },
    );
  }

  try {
    const tiffUrl = await resolveNativeTiffOriginUrl(photo, env.API_BASE_URL);
    const serviceManifest = await requestNativeTileManifest({
      photo,
      origin: url.origin,
      apiPrefix,
      tiffUrl,
      serviceBinding: env.TIFF_TILE_SERVICE,
      serviceUrl: env.TIFF_CONVERSION_SERVICE_URL,
    });

    if (serviceManifest) {
      await r2.putTileManifest(photo.imageName, photo.layerId, JSON.stringify(serviceManifest));

      return nativeSuccess(
        serviceManifest,
        { cache: 'MISS' },
        {
          cacheControl: 'public, max-age=31536000, immutable',
        },
      );
    }

    const rangeManifest = await buildNativeRangeManifestFromTiff(
      photo,
      url.origin,
      apiPrefix,
      tiffUrl,
    );
    return nativeSuccess(
      rangeManifest,
      { cache: 'BYPASS' },
      { cacheControl: 'public, max-age=300' },
    );
  } catch (error) {
    console.error(`Unable to build tile manifest for ${photo.id}:`, error);
  }

  return nativeSuccess(
    buildNativeTileManifest(photo, url.origin, apiPrefix),
    { cache: 'MISS' },
    { cacheControl: 'public, max-age=300' },
  );
};

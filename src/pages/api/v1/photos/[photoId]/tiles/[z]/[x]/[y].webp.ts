import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { R2Manager } from '@/lib/r2';
import {
  nativeError,
  parseNativePhotoId,
  parseNativeTileRef,
  resolveNativeTiffOriginUrl,
} from '@/lib/native-api';
import { requestNativeWebPTile } from '@/lib/native-tile-service';

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=31536000, immutable',
};

export const GET: APIRoute = async ({ params, url }) => {
  const photo = parseNativePhotoId(params.photoId);
  if (!photo) {
    return nativeError(
      'INVALID_PHOTO_ID',
      'Photo id must use the {layerId}:{imageName} format.',
      400,
    );
  }

  const tile = parseNativeTileRef(params.z, params.x, params.y);
  if (!tile) {
    return nativeError('INVALID_TILE_ID', 'Tile coordinates must be non-negative integers.', 400);
  }

  const r2 = new R2Manager(env.TIFF_STORAGE, env.THUMBNAIL_STORAGE);
  const cachedTile = await r2.getTile(photo.imageName, photo.layerId, tile.z, tile.x, tile.y);
  if (cachedTile) {
    return new Response(cachedTile.body, {
      headers: {
        ...CACHE_HEADERS,
        'Content-Type': 'image/webp',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const tiffUrl = await resolveNativeTiffOriginUrl(photo, env.API_BASE_URL);
    const generatedTile = await requestNativeWebPTile({
      photo,
      tile,
      origin: url.origin,
      tiffUrl,
      serviceBinding: env.TIFF_TILE_SERVICE,
      serviceUrl: env.TIFF_CONVERSION_SERVICE_URL,
    });

    if (!generatedTile) {
      return nativeError(
        'TILE_NOT_GENERATED',
        'This WebP tile is not cached yet and the TIFF tile service did not generate it.',
        503,
      );
    }

    await r2.putTile(photo.imageName, photo.layerId, tile.z, tile.x, tile.y, generatedTile.buffer);

    return new Response(generatedTile.buffer, {
      headers: {
        ...CACHE_HEADERS,
        'Content-Type': generatedTile.contentType,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error(`Unable to generate tile ${photo.id}/${tile.z}/${tile.x}/${tile.y}:`, error);
    return nativeError(
      'TILE_GENERATION_FAILED',
      'Failed to generate this WebP tile from the source TIFF.',
      502,
    );
  }
};

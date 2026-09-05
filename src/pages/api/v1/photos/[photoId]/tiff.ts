import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { nativeError, parseNativePhotoId, resolveNativeTiffOriginUrl } from '@/lib/native-api';

export const GET: APIRoute = async ({ params, request }) => {
  const photo = parseNativePhotoId(params.photoId);
  if (!photo) {
    return nativeError(
      'INVALID_PHOTO_ID',
      'Photo id must use the {layerId}:{imageName} format.',
      400,
    );
  }

  const headers: Record<string, string> = {};
  const range = request.headers.get('Range');
  if (range) {
    headers.Range = range;
  }

  try {
    const originUrl = await resolveNativeTiffOriginUrl(photo, env.API_BASE_URL);
    const originResponse = await fetch(originUrl, { headers });

    if (!originResponse.ok && originResponse.status !== 206) {
      return nativeError(
        'TIFF_ORIGIN_ERROR',
        `TIFF origin returned ${originResponse.status}.`,
        originResponse.status,
      );
    }

    const responseHeaders = new Headers({
      'Content-Type': 'image/tiff',
      'Accept-Ranges': originResponse.headers.get('Accept-Ranges') || 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    for (const header of ['Content-Range', 'Content-Length', 'ETag', 'Last-Modified']) {
      const value = originResponse.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    }

    return new Response(originResponse.body, {
      status: originResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return nativeError('TIFF_PROXY_FAILED', 'Failed to fetch TIFF bytes.', 502);
  }
};

export const HEAD: APIRoute = async ({ params, request }) => {
  const photo = parseNativePhotoId(params.photoId);
  if (!photo) {
    return nativeError(
      'INVALID_PHOTO_ID',
      'Photo id must use the {layerId}:{imageName} format.',
      400,
    );
  }

  const headers: Record<string, string> = {};
  const range = request.headers.get('Range');
  if (range) {
    headers.Range = range;
  }

  try {
    const originUrl = await resolveNativeTiffOriginUrl(photo, env.API_BASE_URL);
    const originResponse = await fetch(originUrl, {
      method: 'HEAD',
      headers,
    });

    const responseHeaders = new Headers({
      'Content-Type': 'image/tiff',
      'Accept-Ranges': originResponse.headers.get('Accept-Ranges') || 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    for (const header of ['Content-Range', 'Content-Length', 'ETag', 'Last-Modified']) {
      const value = originResponse.headers.get(header);
      if (value) {
        responseHeaders.set(header, value);
      }
    }

    return new Response(null, {
      status: originResponse.status,
      headers: responseHeaders,
    });
  } catch {
    return nativeError('TIFF_PROXY_FAILED', 'Failed to fetch TIFF metadata.', 502);
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
      'Access-Control-Max-Age': '86400',
    },
  });
};

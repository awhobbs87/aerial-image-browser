import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';

/**
 * GET /api/images/tiff-proxy/:layerId/:imageName
 *
 * Transparent CORS proxy for remote TIFFs that forwards HTTP Range headers.
 * This is required because the Tasmania image server (apimages.nre.tas.gov.au)
 * does not set Access-Control-Allow-Origin, blocking direct browser access.
 *
 * GeoTIFFTileSource uses HTTP range requests to fetch only the tiles it needs
 * from a tiled/pyramidal TIFF, so this proxy must forward Range/Content-Range
 * headers faithfully and return 206 Partial Content when appropriate.
 */
export const GET: APIRoute = async ({ params, request }) => {
  const layerId = params.layerId;
  const imageName = params.imageName;

  if (
    !layerId ||
    ![0, 1, 2].includes(Number(layerId)) ||
    !imageName ||
    imageName.length > 180 ||
    /[/\\]/.test(imageName)
  ) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanName = imageName.replace(/\.tif$/i, '');

  // Build headers to forward to origin — primarily the Range header
  const proxyHeaders: Record<string, string> = {};
  const rangeHeader = request.headers.get('Range');
  if (rangeHeader) {
    proxyHeaders['Range'] = rangeHeader;
  }

  try {
    const key = `photo-tiff-source:v1:${layerId}:${cleanName}`;
    let originUrl = await env.PHOTO_CACHE.get(key).catch(() => null);
    if (!originUrl) {
      const escaped = cleanName.replaceAll("'", "''");
      const query = new URLSearchParams({
        f: 'json',
        where: `IMAGE_NAME='${escaped}.tif' OR IMAGE_NAME='${escaped}'`,
        outFields: 'DOWNLOAD_LINK',
        returnGeometry: 'false',
      });
      const lookup = await fetch(`${env.API_BASE_URL}/${layerId}/query?${query}`, {
        signal: request.signal,
      });
      if (!lookup.ok) throw new Error('Image metadata unavailable');
      const data = (await lookup.json()) as {
        features?: { attributes: { DOWNLOAD_LINK?: string } }[];
      };
      originUrl = data.features?.[0]?.attributes.DOWNLOAD_LINK || null;
      if (!originUrl) return new Response('Original image unavailable', { status: 404 });
      await env.PHOTO_CACHE.put(key, originUrl, { expirationTtl: 86400 }).catch(() => {});
    }
    const originResponse = await fetch(originUrl, {
      headers: proxyHeaders,
      signal: request.signal,
    });

    if (!originResponse.ok && originResponse.status !== 206) {
      return new Response(
        JSON.stringify({ success: false, error: `Origin returned ${originResponse.status}` }),
        { status: originResponse.status, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Build response headers — forward range-related headers from origin
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'image/tiff',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
      'Cache-Control': 'public, max-age=86400',
    };

    // Forward range-response headers
    const contentRange = originResponse.headers.get('Content-Range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    const contentLength = originResponse.headers.get('Content-Length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    const acceptRanges = originResponse.headers.get('Accept-Ranges');
    if (acceptRanges) responseHeaders['Accept-Ranges'] = acceptRanges;
    else responseHeaders['Accept-Ranges'] = 'bytes';

    return new Response(originResponse.body, {
      status: originResponse.status, // 200 or 206
      headers: responseHeaders,
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Failed to proxy TIFF' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

/**
 * Handle OPTIONS preflight for CORS.
 */
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

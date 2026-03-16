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

  if (!layerId || !imageName) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanName = imageName.replace(/\.tif$/i, '');
  const filmNo = cleanName.split('_')[0] || cleanName;
  const originUrl = `https://apimages.nre.tas.gov.au/images/LandTasFilms/${filmNo}/Scans/${cleanName}.tif`;

  // Build headers to forward to origin — primarily the Range header
  const proxyHeaders: Record<string, string> = {};
  const rangeHeader = request.headers.get('Range');
  if (rangeHeader) {
    proxyHeaders['Range'] = rangeHeader;
  }

  try {
    const originResponse = await fetch(originUrl, {
      headers: proxyHeaders,
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

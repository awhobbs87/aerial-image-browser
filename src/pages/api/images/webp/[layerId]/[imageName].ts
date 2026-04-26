import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { R2Manager } from '@/lib/r2';
import { convertTiffToWebP } from '@/lib/image-conversion';

/**
 * GET /api/images/webp/:layerId/:imageName
 *
 * Returns a WebP conversion of the TIFF image.
 * Checks R2 for cached WebP -> falls back to TIFF (cached or fetched) ->
 * converts to WebP -> caches and returns.
 */
export const GET: APIRoute = async ({ params }) => {
  const layerId = parseInt(params.layerId ?? '');
  const imageName = params.imageName;

  if (isNaN(layerId) || !imageName) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Remove .tif extension if provided
  const cleanImageName = imageName.replace(/\.tif$/i, '');

  const r2 = new R2Manager(env.TIFF_STORAGE, env.THUMBNAIL_STORAGE);

  // Check if WebP is already cached in R2
  const cachedWebP = await r2.getWebP(cleanImageName, layerId);
  if (cachedWebP) {
    return new Response(cachedWebP.body, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'HIT',
      },
    });
  }

  // No cached WebP -- get the TIFF (from R2 cache or ArcGIS)
  let tiffBuffer: ArrayBuffer;
  const cachedTiff = await r2.getTiff(cleanImageName, layerId);

  if (cachedTiff) {
    tiffBuffer = await cachedTiff.arrayBuffer();
  } else {
    // Fetch TIFF from ArcGIS
    const queryParams = new URLSearchParams({
      f: 'json',
      where: `IMAGE_NAME='${cleanImageName}.tif'`,
      outFields: 'DOWNLOAD_LINK',
      returnGeometry: 'false',
    });

    const searchResponse = await fetch(`${env.API_BASE_URL}/${layerId}/query?${queryParams}`);
    const searchData = (await searchResponse.json()) as {
      features?: Array<{ attributes: { DOWNLOAD_LINK?: string } }>;
    };

    if (!searchData.features || searchData.features.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Image not found in ArcGIS' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const downloadLink = searchData.features[0].attributes.DOWNLOAD_LINK;
    if (!downloadLink) {
      return new Response(JSON.stringify({ success: false, error: 'No download link available' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tiffResponse = await fetch(downloadLink);
    if (!tiffResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to download TIFF from ArcGIS' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    tiffBuffer = await tiffResponse.arrayBuffer();

    // Cache the TIFF for future use
    await r2.putTiff(cleanImageName, layerId, tiffBuffer);
  }

  // Convert TIFF to WebP
  try {
    const webpBuffer = await convertTiffToWebP(tiffBuffer, { quality: 95 });

    // Cache the WebP in R2
    await r2.putWebP(cleanImageName, layerId, webpBuffer);

    const originalSize = tiffBuffer.byteLength;
    const convertedSize = webpBuffer.byteLength;
    const reduction = ((1 - convertedSize / originalSize) * 100).toFixed(1);

    return new Response(webpBuffer, {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'MISS',
        'X-Original-Size': originalSize.toString(),
        'X-Converted-Size': convertedSize.toString(),
        'X-Size-Reduction': `${reduction}%`,
      },
    });
  } catch (error) {
    console.error(`Error converting TIFF to WebP for ${cleanImageName}:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to convert image to WebP',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

/**
 * PUT /api/images/webp/:layerId/:imageName
 *
 * Accepts a client-side converted WebP buffer and caches it in R2.
 * Used when the browser performs the TIFF-to-WebP conversion locally.
 */
export const PUT: APIRoute = async ({ params, request }) => {
  const layerId = parseInt(params.layerId ?? '');
  const imageName = params.imageName;

  if (isNaN(layerId) || !imageName) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Remove .tif extension if provided
  const cleanImageName = imageName.replace(/\.tif$/i, '');

  try {
    const webpBuffer = await request.arrayBuffer();

    if (!webpBuffer || webpBuffer.byteLength === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Empty request body' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const r2 = new R2Manager(env.TIFF_STORAGE, env.THUMBNAIL_STORAGE);
    await r2.putWebP(cleanImageName, layerId, webpBuffer);

    console.log(
      `Cached client-converted WebP for ${cleanImageName}: ${(webpBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'WebP cached successfully',
        size: webpBuffer.byteLength,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error(`Error caching WebP for ${cleanImageName}:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to cache WebP',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

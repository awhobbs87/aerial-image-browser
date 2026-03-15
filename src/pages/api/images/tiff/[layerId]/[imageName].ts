import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { R2Manager } from '@/lib/r2';

/**
 * GET /api/images/tiff/:layerId/:imageName
 *
 * Downloads and caches TIFF images from ArcGIS via R2.
 * Returns the TIFF binary with cache headers.
 */
export const GET: APIRoute = async ({ params }) => {
  const layerId = parseInt(params.layerId ?? '');
  const imageName = params.imageName;

  if (isNaN(layerId) || !imageName) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid parameters' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Remove .tif extension if provided
  const cleanImageName = imageName.replace(/\.tif$/i, '');

  const r2 = new R2Manager(env.TIFF_STORAGE, env.THUMBNAIL_STORAGE);

  // Check R2 cache
  const cached = await r2.getTiff(cleanImageName, layerId);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        'Content-Type': 'image/tiff',
        'Cache-Control': 'public, max-age=31536000',
        'X-Cache': 'HIT',
      },
    });
  }

  // Search ArcGIS for the DOWNLOAD_LINK
  const queryParams = new URLSearchParams({
    f: 'json',
    where: `IMAGE_NAME='${cleanImageName}.tif'`,
    outFields: 'DOWNLOAD_LINK',
    returnGeometry: 'false',
  });

  const searchResponse = await fetch(
    `${env.API_BASE_URL}/${layerId}/query?${queryParams}`,
  );
  const searchData = (await searchResponse.json()) as {
    features?: Array<{ attributes: { DOWNLOAD_LINK?: string } }>;
  };

  if (!searchData.features || searchData.features.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: 'Image not found in ArcGIS' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const downloadLink = searchData.features[0].attributes.DOWNLOAD_LINK;
  if (!downloadLink) {
    return new Response(
      JSON.stringify({ success: false, error: 'No download link available' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Download the TIFF from ArcGIS
  const tiffResponse = await fetch(downloadLink);
  if (!tiffResponse.ok) {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to download from ArcGIS' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const tiffBuffer = await tiffResponse.arrayBuffer();

  // Cache in R2
  await r2.putTiff(cleanImageName, layerId, tiffBuffer);

  return new Response(tiffBuffer, {
    headers: {
      'Content-Type': 'image/tiff',
      'Cache-Control': 'public, max-age=31536000',
      'X-Cache': 'MISS',
    },
  });
};

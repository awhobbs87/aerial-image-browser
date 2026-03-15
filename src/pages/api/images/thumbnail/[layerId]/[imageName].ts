import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { R2Manager } from '@/lib/r2';

/**
 * GET /api/images/thumbnail/:layerId/:imageName
 *
 * Downloads and caches thumbnail JPEGs from ArcGIS via R2.
 * Returns the thumbnail binary with cache headers.
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

  // Remove .jpg extension if provided
  const cleanImageName = imageName.replace(/\.jpg$/i, '');

  const r2 = new R2Manager(env.TIFF_STORAGE, env.THUMBNAIL_STORAGE);

  // Check R2 cache
  const cached = await r2.getThumbnail(cleanImageName, layerId);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000',
        'X-Cache': 'HIT',
      },
    });
  }

  // Search ArcGIS for the THUMBNAIL_LINK
  const queryParams = new URLSearchParams({
    f: 'json',
    where: `IMAGE_NAME='${cleanImageName}.tif'`,
    outFields: 'THUMBNAIL_LINK',
    returnGeometry: 'false',
  });

  const searchResponse = await fetch(
    `${env.API_BASE_URL}/${layerId}/query?${queryParams}`,
  );
  const searchData = (await searchResponse.json()) as {
    features?: Array<{ attributes: { THUMBNAIL_LINK?: string } }>;
  };

  if (!searchData.features || searchData.features.length === 0) {
    return new Response(
      JSON.stringify({ success: false, error: 'Image not found in ArcGIS' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const thumbnailLink = searchData.features[0].attributes.THUMBNAIL_LINK;
  if (!thumbnailLink) {
    return new Response(
      JSON.stringify({ success: false, error: 'No thumbnail link available' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Download the thumbnail from ArcGIS
  const thumbResponse = await fetch(thumbnailLink);
  if (!thumbResponse.ok) {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to download thumbnail from ArcGIS' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const thumbBuffer = await thumbResponse.arrayBuffer();

  // Cache in R2
  await r2.putThumbnail(cleanImageName, layerId, thumbBuffer);

  return new Response(thumbBuffer, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000',
      'X-Cache': 'MISS',
    },
  });
};

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

/**
 * GET /api/images/image/:layerId/:imageName
 *
 * Optimized image endpoint using Cloudflare Image Resizing.
 * Fetches the JPEG thumbnail from ArcGIS and applies on-the-fly
 * resizing/format conversion via the `cf.image` fetch option.
 *
 * Query params:
 *   - width: target width (optional)
 *   - height: target height (optional)
 *   - quality: 1-100 (default 100)
 *   - format: auto | webp | jpeg | png (default 'auto')
 */
export const GET: APIRoute = async ({ params, url }) => {
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

  // Parse optional transformation query params
  const widthParam = url.searchParams.get('width');
  const heightParam = url.searchParams.get('height');
  const qualityParam = url.searchParams.get('quality');
  const formatParam = url.searchParams.get('format');

  const width = widthParam ? parseInt(widthParam) : undefined;
  const height = heightParam ? parseInt(heightParam) : undefined;
  const quality = qualityParam ? parseInt(qualityParam) : 100;
  const format = formatParam || 'auto';

  // Search ArcGIS for the THUMBNAIL_LINK
  // Image Resizing needs a JPEG source -- TIFF is not supported by cf.image
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

  const sourceLink = searchData.features[0].attributes.THUMBNAIL_LINK;
  if (!sourceLink) {
    return new Response(
      JSON.stringify({ success: false, error: 'No thumbnail link available' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Build Cloudflare Image Resizing options
  const resizeOptions: Record<string, string | number> = {
    format,
    quality,
  };

  if (width) resizeOptions.width = width;
  if (height) resizeOptions.height = height;
  if (width || height) resizeOptions.fit = 'scale-down';

  // Fetch with Cloudflare Image Resizing applied
  const optimizedResponse = await fetch(sourceLink, {
    cf: {
      image: resizeOptions,
    },
  } as RequestInit);

  if (!optimizedResponse.ok) {
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to optimize image' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(optimizedResponse.body, {
    headers: {
      'Content-Type': optimizedResponse.headers.get('Content-Type') || 'image/jpeg',
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=31536000',
      'X-Optimized': 'true',
    },
  });
};

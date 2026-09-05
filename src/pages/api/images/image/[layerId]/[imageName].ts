import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

/**
 * GET /api/images/image/:layerId/:imageName
 *
 * Fetches the best available image from ArcGIS (THUMBNAIL_LINK or DOWNLOAD_LINK).
 * Attempts Cloudflare Image Resizing when available; falls back to raw proxy.
 *
 * Query params:
 *   - width: target width (optional)
 *   - height: target height (optional)
 *   - quality: 1-100 (default 85)
 *   - format: auto | webp | jpeg | png (default 'auto')
 */
export const GET: APIRoute = async ({ params, url }) => {
  const layerId = parseInt(params.layerId ?? '');
  const imageName = params.imageName;

  if (isNaN(layerId) || !imageName) {
    return new Response(JSON.stringify({ success: false, error: 'Invalid parameters' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cleanImageName = imageName.replace(/\.tif$/i, '');
  const escapedImageName = cleanImageName.replace(/'/g, "''");

  const widthParam = url.searchParams.get('width');
  const heightParam = url.searchParams.get('height');
  const qualityParam = url.searchParams.get('quality');
  const formatParam = url.searchParams.get('format');

  const width = widthParam ? parseInt(widthParam) : undefined;
  const height = heightParam ? parseInt(heightParam) : undefined;
  const quality = qualityParam ? parseInt(qualityParam) : 85;
  const format = formatParam || 'auto';

  // Query ArcGIS for both THUMBNAIL_LINK and DOWNLOAD_LINK
  const queryParams = new URLSearchParams({
    f: 'json',
    where: `IMAGE_NAME='${escapedImageName}.tif' OR IMAGE_NAME='${escapedImageName}'`,
    outFields: 'THUMBNAIL_LINK,DOWNLOAD_LINK',
    returnGeometry: 'false',
  });

  const searchResponse = await fetch(`${env.API_BASE_URL}/${layerId}/query?${queryParams}`);
  const searchData = (await searchResponse.json()) as {
    features?: Array<{
      attributes: { THUMBNAIL_LINK?: string; DOWNLOAD_LINK?: string };
    }>;
  };

  if (!searchData.features || searchData.features.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'Image not found in ArcGIS' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const attrs = searchData.features[0].attributes;
  // Prefer THUMBNAIL_LINK (JPEG, fast) > construct thumbnail URL from DOWNLOAD_LINK
  let sourceLink = attrs.THUMBNAIL_LINK || '';

  if (!sourceLink && attrs.DOWNLOAD_LINK) {
    // DOWNLOAD_LINK is the .tif scan URL. Derive the thumbnail path from it:
    // .../Scans/NAME.tif -> .../Thumbnails/NAME_thumb.jpg
    sourceLink = attrs.DOWNLOAD_LINK.replace('/Scans/', '/Thumbnails/').replace(
      /\.tif$/i,
      '_thumb.jpg',
    );
  }

  if (!sourceLink) {
    return new Response(JSON.stringify({ success: false, error: 'No image link available' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Try fetching with Cloudflare Image Resizing (only works on proxied custom domains)
  try {
    const resizeOptions: Record<string, string | number> = { format, quality };
    if (width) resizeOptions.width = width;
    if (height) resizeOptions.height = height;
    if (width || height) resizeOptions.fit = 'scale-down';

    const optimizedResponse = await fetch(sourceLink, {
      cf: { image: resizeOptions },
    } as RequestInit);

    if (optimizedResponse.ok) {
      return new Response(optimizedResponse.body, {
        headers: {
          'Content-Type': optimizedResponse.headers.get('Content-Type') || 'image/jpeg',
          'Content-Disposition': 'inline',
          'Cache-Control': 'public, max-age=31536000',
          'X-Optimized': 'cf-image',
        },
      });
    }
  } catch {
    // cf.image not available (workers.dev, local dev) — fall through to raw fetch
  }

  // Fallback: raw proxy without resizing
  try {
    const rawResponse = await fetch(sourceLink);
    if (!rawResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Origin returned ${rawResponse.status}` }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(rawResponse.body, {
      headers: {
        'Content-Type': rawResponse.headers.get('Content-Type') || 'image/jpeg',
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=31536000',
        'X-Optimized': 'none',
      },
    });
  } catch {
    return new Response(JSON.stringify({ success: false, error: 'Failed to fetch image' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

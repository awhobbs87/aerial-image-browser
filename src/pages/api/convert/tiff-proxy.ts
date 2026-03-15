import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const imageUrl = url.searchParams.get('url');

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing url parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Fetch the converted image from R2
    const imageResponse = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Cloudflare-Worker/1.0)' },
    });

    if (!imageResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('Content-Type') || 'image/webp';

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('TIFF conversion proxy error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to proxy image',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

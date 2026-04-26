import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const GET: APIRoute = async () => {
  try {
    const serviceUrl = env.TIFF_CONVERSION_SERVICE_URL;
    if (!serviceUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'TIFF conversion service URL not configured',
          available: false,
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const response = await fetch(`${serviceUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Service returned ${response.status}`,
          available: false,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const data = (await response.json()) as { status?: string; timestamp?: string };
    return new Response(
      JSON.stringify({
        success: true,
        status: data.status,
        timestamp: data.timestamp,
        available: true,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('TIFF conversion service health check error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Service unavailable',
        available: false,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

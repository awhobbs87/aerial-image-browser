import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const serviceUrl = env.TIFF_CONVERSION_SERVICE_URL;
    if (!serviceUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'TIFF conversion service URL not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ success: false, error: 'No file uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.match(/\.(tif|tiff)$/)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only TIFF files are allowed' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Validate file size (1GB limit)
    if (file.size > 1024 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: 'File size exceeds 1GB limit' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Create new FormData to forward to conversion service
    const forwardFormData = new FormData();
    forwardFormData.append('file', file);

    // Forward request to conversion service
    console.log(`Calling conversion service: ${serviceUrl}/convert-upload`);
    let response: Response;
    try {
      response = await fetch(`${serviceUrl}/convert-upload`, {
        method: 'POST',
        body: forwardFormData,
        signal: AbortSignal.timeout(600_000), // 10 minutes
      });
    } catch (fetchError) {
      console.error('Fetch error details:', fetchError);
      throw new Error(
        `Failed to connect to conversion service at ${serviceUrl}: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
      );
    }

    if (!response.ok) {
      let errorText = '';
      try {
        const errorJson = (await response.json()) as { error?: string };
        errorText = errorJson.error || `HTTP ${response.status}`;
      } catch {
        errorText = (await response.text()) || `HTTP ${response.status}`;
      }
      const statusCode = response.status >= 500 ? 502 : response.status >= 400 ? 400 : 500;
      return new Response(JSON.stringify({ success: false, error: errorText }), {
        status: statusCode,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = (await response.json()) as {
      success?: boolean;
      url?: string;
      format?: string;
      originalSize?: number;
      convertedSize?: number;
      duration?: number;
      error?: string;
    };

    if (data.success) {
      // Return a proxy URL instead of the direct R2 URL to avoid CORS issues
      const baseUrl = new URL(request.url).origin;
      const proxyUrl = `${baseUrl}/api/convert/tiff-proxy?url=${encodeURIComponent(data.url || '')}`;
      return new Response(
        JSON.stringify({
          success: true,
          url: proxyUrl,
          format: data.format,
          originalSize: data.originalSize,
          convertedSize: data.convertedSize,
          duration: data.duration,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: data.error || 'Conversion failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('TIFF conversion service error:', error);
    const serviceUrl = env.TIFF_CONVERSION_SERVICE_URL || 'https://tiff.awhq.uk';

    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ success: false, error: 'Conversion timed out (10 minutes)' }),
        { status: 504, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const errorMessage = error instanceof Error ? error.message : 'Conversion failed';
    const isNetworkError =
      error instanceof Error &&
      (error.message.includes('fetch') ||
        error.message.includes('network') ||
        error.name === 'TypeError');

    return new Response(
      JSON.stringify({
        success: false,
        error: isNetworkError
          ? `Network error connecting to conversion service: ${errorMessage}. Please check if the service is running at ${serviceUrl}`
          : errorMessage,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

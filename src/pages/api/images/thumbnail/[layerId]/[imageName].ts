import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { servePhotoImage } from '@/lib/photo-media';

export const GET: APIRoute = async ({ request, params, locals }) => {
  try {
    return await servePhotoImage(
      request,
      Number(params.layerId),
      params.imageName || '',
      env,
      (task) => locals.cfContext.waitUntil(task),
    );
  } catch (error) {
    console.error('Photo image request failed', error);
    return new Response('Image temporarily unavailable', { status: 502 });
  }
};

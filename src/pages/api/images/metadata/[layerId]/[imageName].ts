import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { enhancePhoto } from '@/lib/search-helpers';
import type { ArcGISFeature } from '@/lib/arcgis';
export const GET: APIRoute = async ({ params, request, locals }) => {
  const layer = Number(params.layerId),
    name = params.imageName || '';
  if (![0, 1, 2].includes(layer) || !name || name.length > 180 || /[/\\]/.test(name))
    return new Response('Invalid photo', { status: 400 });
  const key = `photo-metadata:v1:${layer}:${name}`;
  try {
    const cached = await env.PHOTO_CACHE.get(key, 'json').catch(() => null);
    if (cached) return Response.json(cached);
    const escaped = name.replace(/\.tif$/i, '').replaceAll("'", "''");
    const query = new URLSearchParams({
      f: 'json',
      where: `IMAGE_NAME='${escaped}.tif' OR IMAGE_NAME='${escaped}'`,
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
    });
    const response = await fetch(`${env.API_BASE_URL}/${layer}/query?${query}`, {
      signal: request.signal,
    });
    if (!response.ok) throw new Error('Photo metadata unavailable');
    const data = (await response.json()) as { features?: ArcGISFeature[]; error?: unknown };
    if (data.error) throw new Error('Photo metadata unavailable');
    if (!data.features?.[0]) return new Response('Photo not found', { status: 404 });
    const photo = enhancePhoto(data.features[0], layer);
    const write = env.PHOTO_CACHE.put(key, JSON.stringify(photo), { expirationTtl: 86400 }).catch(
      () => {},
    );
    if (locals.cfContext) locals.cfContext.waitUntil(write);
    else await write;
    return Response.json(photo);
  } catch {
    return new Response('Photo metadata unavailable', { status: 502 });
  }
};

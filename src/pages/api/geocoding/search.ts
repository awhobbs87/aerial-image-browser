import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { searchTasmania } from '@/lib/tasmania-geocoder';
export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim() || '';
  if (query.length < 2 || query.length > 160)
    return Response.json({ error: 'Enter between 2 and 160 characters.' }, { status: 400 });
  const key = `geocode:list:v2:${query.toUpperCase()}`;
  try {
    const cached = await env.PHOTO_CACHE.get(key, 'json').catch(() => null);
    if (cached) return Response.json(cached);
    const results = await searchTasmania(query, 10, request.signal);
    const write = env.PHOTO_CACHE.put(key, JSON.stringify(results), { expirationTtl: 86400 }).catch(
      () => {},
    );
    if (locals.cfContext) locals.cfContext.waitUntil(write);
    else await write;
    return Response.json(results);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Location search failed' },
      { status: 502 },
    );
  }
};

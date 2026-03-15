import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ArcGISClient } from '@/lib/arcgis';
import { CacheManager } from '@/lib/cache';

export const GET: APIRoute = async () => {
  const cache = new CacheManager(env.PHOTO_CACHE);

  // Check cache first
  const cached = await cache.get<unknown>('layers:all');
  if (cached) {
    return new Response(
      JSON.stringify({ success: true, data: cached, cached: true }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Fetch from ArcGIS
  const client = new ArcGISClient(env.API_BASE_URL);
  const layers = await client.getLayers();

  // Cache for 24 hours
  await cache.set('layers:all', layers);

  return new Response(
    JSON.stringify({ success: true, data: layers, cached: false }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { nativeSuccess } from '@/lib/native-api';

export const GET: APIRoute = async () => {
  const bindings = {
    kv: false,
    d1: false,
    r2: false,
    ai: false,
  };

  try {
    await env.PHOTO_CACHE.get('__health_check__');
    bindings.kv = true;
  } catch {
    // KV unavailable.
  }

  try {
    await env.PHOTOS_DB.prepare('SELECT 1').first();
    bindings.d1 = true;
  } catch {
    // D1 unavailable.
  }

  try {
    await env.TIFF_STORAGE.head('__health_check__');
    bindings.r2 = true;
  } catch {
    // R2 unavailable.
  }

  bindings.ai = Boolean(env.AI);

  const allHealthy = Object.values(bindings).every(Boolean);

  return nativeSuccess({
    status: allHealthy ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    bindings,
  });
};

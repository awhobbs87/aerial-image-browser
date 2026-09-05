import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { ArcGISClient } from '@/lib/arcgis';
import { CacheManager } from '@/lib/cache';
import { nativeError, nativeSuccess, type NativeLayer } from '@/lib/native-api';

interface ArcGISLayersResponse {
  layers?: Array<{
    id?: number;
    name?: string;
    description?: string;
  }>;
}

export const GET: APIRoute = async () => {
  const cache = new CacheManager(env.PHOTO_CACHE);

  try {
    const cached = await cache.get<ArcGISLayersResponse>('layers:all');
    if (cached) {
      return nativeSuccess(mapLayers(cached), { cache: 'HIT' });
    }

    const client = new ArcGISClient(env.API_BASE_URL);
    const layers = (await client.getLayers()) as ArcGISLayersResponse;

    await cache.set('layers:all', layers);

    return nativeSuccess(mapLayers(layers), { cache: 'MISS' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load layers';
    return nativeError('LAYERS_FAILED', message, 500);
  }
};

function mapLayers(response: ArcGISLayersResponse): NativeLayer[] {
  return (response.layers ?? []).map((layer) => ({
    id: layer.id ?? 0,
    name: layer.name ?? `Layer ${layer.id ?? 0}`,
    description: layer.description ?? null,
  }));
}

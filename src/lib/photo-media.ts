import { IMAGE_VARIANTS, type ImageVariant } from './photo-images';

interface MediaBindings {
  API_BASE_URL: string;
  PHOTO_CACHE: KVNamespace;
  THUMBNAIL_STORAGE: R2Bucket;
  IMAGES?: ImagesBinding;
}
type Defer = (task: Promise<unknown>) => void;

function background(defer: Defer, task: Promise<unknown>) {
  defer(task.catch((error: unknown) => console.warn('Image cache write failed', error)));
}

// Images binding output is a stream of unknown length; R2 requires a known
// length. Buffer only the cache copy, with a strict cap, outside the response path.
async function cacheImage(bucket: R2Bucket, key: string, response: Response) {
  if (!response.body) return;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  const limit = 16 * 1024 * 1024;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        return;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  await bucket.put(key, bytes, {
    httpMetadata: { contentType: response.headers.get('Content-Type') || 'image/jpeg' },
  });
}

export async function servePhotoImage(
  request: Request,
  layerId: number,
  imageName: string,
  bindings: MediaBindings,
  defer: Defer,
): Promise<Response> {
  if (
    ![0, 1, 2].includes(layerId) ||
    !imageName ||
    imageName.length > 200 ||
    /[/\\]/.test(imageName)
  ) {
    return new Response('Invalid image', { status: 400 });
  }
  const cleanName = imageName.replace(/\.(tif|jpg)$/i, '');
  const variant = new URL(request.url).searchParams.get('variant');
  if (variant && !Object.hasOwn(IMAGE_VARIANTS, variant))
    return new Response('Invalid variant', { status: 400 });
  const preset = variant ? IMAGE_VARIANTS[variant as ImageVariant] : null;
  const key = preset
    ? `variants/v1/${layerId}/${cleanName}/${variant}.webp`
    : `thumbnail/${layerId}/${cleanName}.jpg`;
  const edgeKey = new URL(`/__photo-cache/${key}`, request.url).toString();
  const edge =
    typeof caches !== 'undefined' && 'default' in caches ? (caches.default as Cache) : undefined;
  const hit = await edge?.match(edgeKey).catch(() => undefined);
  if (hit) {
    const response = new Response(hit.body, hit);
    response.headers.set('X-Cache', 'EDGE');
    return response;
  }

  const respond = (body: ReadableStream, contentType: string, cache: string, optimized = true) =>
    new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': optimized ? 'public, max-age=86400' : 'public, max-age=60',
        'X-Cache': cache,
        'X-Optimized': preset && optimized ? 'images-binding' : 'none',
      },
    });
  const stored = await bindings.THUMBNAIL_STORAGE.get(key);
  if (stored) {
    const response = respond(
      stored.body,
      stored.httpMetadata?.contentType || (preset ? 'image/webp' : 'image/jpeg'),
      'R2',
    );
    if (edge) background(defer, edge.put(edgeKey, response.clone()));
    return response;
  }

  const originalKey = `thumbnail/${layerId}/${cleanName}.jpg`;
  const original = preset ? await bindings.THUMBNAIL_STORAGE.get(originalKey) : null;
  let source: Response;
  if (original)
    source = new Response(original.body, {
      headers: { 'Content-Type': original.httpMetadata?.contentType || 'image/jpeg' },
    });
  else {
    const metadataKey = `photo-source:v1:${layerId}:${cleanName}`;
    let sourceLink = await bindings.PHOTO_CACHE.get(metadataKey).catch(() => null);
    if (!sourceLink) {
      const escaped = cleanName.replace(/'/g, "''");
      const params = new URLSearchParams({
        f: 'json',
        where: `IMAGE_NAME='${escaped}.tif' OR IMAGE_NAME='${escaped}'`,
        outFields: 'THUMBNAIL_LINK,DOWNLOAD_LINK',
        returnGeometry: 'false',
      });
      const response = await fetch(`${bindings.API_BASE_URL}/${layerId}/query?${params}`, {
        signal: request.signal,
      });
      if (!response.ok) return new Response('Image lookup failed', { status: 502 });
      const data = (await response.json()) as {
        features?: { attributes: { THUMBNAIL_LINK?: string; DOWNLOAD_LINK?: string } }[];
        error?: unknown;
      };
      if (data.error) return new Response('Image lookup failed', { status: 502 });
      const attributes = data.features?.[0]?.attributes;
      sourceLink =
        attributes?.THUMBNAIL_LINK ||
        attributes?.DOWNLOAD_LINK?.replace('/Scans/', '/Thumbnails/').replace(
          /\.tif$/i,
          '_thumb.jpg',
        ) ||
        null;
      if (!sourceLink) return new Response('Image not found', { status: 404 });
      background(
        defer,
        bindings.PHOTO_CACHE.put(metadataKey, sourceLink, { expirationTtl: 86400 }),
      );
    }
    // Source URLs originate from the trusted LIST service, never a request parameter.
    source = await fetch(sourceLink, { signal: request.signal });
    if (!source.ok || !source.body || !source.headers.get('Content-Type')?.startsWith('image/')) {
      return new Response('Image download failed', { status: 502 });
    }
    background(defer, cacheImage(bindings.THUMBNAIL_STORAGE, originalKey, source.clone()));
  }

  if (preset && bindings.IMAGES && source.body) {
    try {
      const transformed = await bindings.IMAGES.input(source.clone().body!)
        .transform({ width: preset.width, height: preset.width, fit: 'scale-down' })
        .output({ format: 'image/webp', quality: preset.quality });
      const output = transformed.response();
      if (!output.ok || !output.body) throw new Error('Empty image transformation');
      const response = respond(output.body, 'image/webp', 'MISS');
      background(defer, cacheImage(bindings.THUMBNAIL_STORAGE, key, response.clone()));
      if (edge) background(defer, edge.put(edgeKey, response.clone()));
      return response;
    } catch (error) {
      console.warn('Image transformation failed; serving original', error);
    }
  }
  // Do not permanently store an unresized fallback under a variant key.
  const response = respond(
    source.body!,
    source.headers.get('Content-Type') || 'image/jpeg',
    'MISS',
    !preset,
  );
  if (!preset && edge) background(defer, edge.put(edgeKey, response.clone()));
  return response;
}

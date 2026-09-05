import type { NativePhotoRef, NativeTileManifest, NativeTileRef } from '@/lib/native-api';

const DEFAULT_TILE_SIZE = 512;
const DEFAULT_TILE_FORMAT = 'webp';

interface TileServiceRequest {
  photo: NativePhotoRef;
  tiffUrl: string;
  origin: string;
  apiPrefix?: string;
  serviceBinding?: Fetcher;
  serviceUrl?: string;
}

interface TileRequest extends TileServiceRequest {
  tile: NativeTileRef;
}

interface TileResponse {
  buffer: ArrayBuffer;
  contentType: string;
}

export async function requestNativeTileManifest(
  request: TileServiceRequest,
): Promise<NativeTileManifest | null> {
  const response = await fetchTileService(request, '/tiles/manifest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildBasePayload(request)),
  });
  if (!response) return null;

  if (!response.ok) {
    console.warn(`Native tile service manifest request failed with ${response.status}.`);
    return null;
  }

  const payload = (await response.json()) as {
    success?: boolean;
    data?: NativeTileManifest;
    manifest?: NativeTileManifest;
  };
  const manifest = payload.manifest ?? payload.data;

  return isWebPTileManifest(manifest) ? manifest : null;
}

export async function requestNativeWebPTile(request: TileRequest): Promise<TileResponse | null> {
  const response = await fetchTileService(request, '/tiles/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...buildBasePayload(request),
      z: request.tile.z,
      x: request.tile.x,
      y: request.tile.y,
    }),
  });
  if (!response) return null;

  if (!response.ok) {
    console.warn(`Native tile service tile request failed with ${response.status}.`);
    return null;
  }

  const contentType = response.headers.get('Content-Type') ?? '';
  if (!contentType.toLowerCase().includes('image/webp')) {
    console.warn(
      `Native tile service returned unsupported content type: ${contentType || 'unknown'}.`,
    );
    return null;
  }

  return {
    buffer: await response.arrayBuffer(),
    contentType: 'image/webp',
  };
}

function buildBasePayload(request: TileServiceRequest) {
  return {
    photoId: request.photo.id,
    layerId: request.photo.layerId,
    imageName: request.photo.imageName,
    tiffUrl: request.tiffUrl,
    tileSize: DEFAULT_TILE_SIZE,
    format: DEFAULT_TILE_FORMAT,
    tileUrlTemplate: `${request.origin}${request.apiPrefix ?? '/api/v1'}/photos/${request.photo.encodedId}/tiles/{z}/{x}/{y}.webp`,
    rangeUrl: `${request.origin}${request.apiPrefix ?? '/api/v1'}/photos/${request.photo.encodedId}/tiff`,
  };
}

async function fetchTileService(
  request: TileServiceRequest,
  path: string,
  init: RequestInit,
): Promise<Response | null> {
  const localServiceUrl = getLocalServiceUrl(request.serviceUrl);
  if (localServiceUrl) {
    return fetch(`${normalizeServiceUrl(localServiceUrl)}${path}`, init);
  }

  if (request.serviceBinding) {
    return request.serviceBinding.fetch(
      new Request(`https://tiff-tile-service.internal${path}`, init),
    );
  }

  if (request.serviceUrl) {
    return fetch(`${normalizeServiceUrl(request.serviceUrl)}${path}`, init);
  }

  return null;
}

function isWebPTileManifest(
  manifest: NativeTileManifest | undefined,
): manifest is NativeTileManifest {
  return Boolean(
    manifest &&
    manifest.format === 'webp' &&
    manifest.width > 0 &&
    manifest.height > 0 &&
    manifest.tileSize > 0 &&
    manifest.levels.length > 0,
  );
}

function normalizeServiceUrl(serviceUrl: string): string {
  return serviceUrl.replace(/\/+$/, '');
}

function getLocalServiceUrl(serviceUrl: string | undefined): string | null {
  if (!serviceUrl) return null;

  const url = new URL(serviceUrl);
  return url.hostname === 'localhost' || url.hostname === '127.0.0.1' ? serviceUrl : null;
}

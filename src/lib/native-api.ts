import type { EnhancedPhoto } from '@/types/photo';

export interface NativeApiMeta {
  requestId: string;
  cache?: 'HIT' | 'MISS' | 'BYPASS';
}

export interface NativeLayer {
  id: number;
  name: string;
  description: string | null;
}

export interface NativePhoto {
  id: string;
  layerId: number;
  imageName: string;
  title: string;
  year: number | null;
  captureDate: string | null;
  photoType: string | null;
  project: string | null;
  scale: number | null;
  centroid: {
    lat: number;
    lng: number;
  };
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
  footprint: {
    type: 'Polygon';
    coordinates: number[][][];
  } | null;
  links: {
    thumbnail: string | null;
    preview: string;
    tileManifest: string;
    tiff: string;
  };
}

export interface NativeSearchResponse {
  count: number;
  photos: NativePhoto[];
}

export interface NativePhotoRef {
  id: string;
  layerId: number;
  imageName: string;
  encodedId: string;
}

export interface NativeTileRef {
  z: number;
  x: number;
  y: number;
}

export interface NativeTileManifest {
  photoId: string;
  format: 'tiff-range' | 'webp';
  width: number;
  height: number;
  tileSize: number;
  overlap: number;
  levels: Array<{
    z: number;
    width: number;
    height: number;
    columns: number;
    rows: number;
  }>;
  tileUrlTemplate: string;
  source: {
    type: 'tiff';
    rangeUrl: string;
    supportsRange: boolean;
  };
}

export function nativeSuccess(
  data: unknown,
  meta?: Partial<NativeApiMeta>,
  init?: {
    status?: number;
    cacheControl?: string;
    headers?: HeadersInit;
  },
): Response {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      meta: buildMeta(meta),
    }),
    {
      status: init?.status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': init?.cacheControl ?? 'no-store',
        ...init?.headers,
      },
    },
  );
}

export function nativeError(code: string, message: string, status = 400): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message },
      meta: buildMeta(),
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    },
  );
}

export function getNativeApiPrefix(url: URL): '/api/v1' | '/v1' {
  return url.pathname.startsWith('/v1') ? '/v1' : '/api/v1';
}

export function mapNativePhoto(
  photo: EnhancedPhoto,
  origin: string,
  apiPrefix = '/api/v1',
): NativePhoto {
  const bounds = getBounds(photo.rings);
  const centroid = bounds
    ? {
        lat: (bounds.north + bounds.south) / 2,
        lng: (bounds.east + bounds.west) / 2,
      }
    : { lat: 0, lng: 0 };

  const imageName = photo.name.replace(/\.tif$/i, '');
  const id = `${photo.layerId}:${imageName}`;
  const encodedId = encodeURIComponent(id);
  const captureDate = photo.dateFlown ? new Date(photo.dateFlown).toISOString() : null;

  return {
    id,
    layerId: photo.layerId,
    imageName,
    title: imageName,
    year: photo.year || null,
    captureDate,
    photoType: photo.type || null,
    project: photo.layerName || null,
    scale: photo.scale || null,
    centroid,
    bounds,
    footprint:
      photo.rings.length > 0
        ? {
            type: 'Polygon',
            coordinates: photo.rings,
          }
        : null,
    links: {
      thumbnail: photo.thumbnailUrl || `${origin}${apiPrefix}/photos/${encodedId}/thumbnail`,
      preview: `${origin}${apiPrefix}/photos/${encodedId}/preview`,
      tileManifest: `${origin}${apiPrefix}/photos/${encodedId}/tile-manifest`,
      tiff: `${origin}${apiPrefix}/photos/${encodedId}/tiff`,
    },
  };
}

export function parseNativeLayerIds(url: URL): number[] {
  const raw = url.searchParams.get('layers');
  if (!raw) return [0, 1, 2];

  return raw
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 0);
}

export function parseNativePhotoId(rawPhotoId: string | undefined): NativePhotoRef | null {
  if (!rawPhotoId) return null;

  const photoId = decodeURIComponent(rawPhotoId);
  const separatorIndex = photoId.indexOf(':');
  if (separatorIndex <= 0 || separatorIndex === photoId.length - 1) return null;

  const layerId = Number(photoId.slice(0, separatorIndex));
  const imageName = photoId.slice(separatorIndex + 1).replace(/\.tif$/i, '');

  if (!Number.isInteger(layerId) || layerId < 0 || !imageName) return null;

  return {
    id: `${layerId}:${imageName}`,
    layerId,
    imageName,
    encodedId: encodeURIComponent(`${layerId}:${imageName}`),
  };
}

export function buildNativeTiffOriginUrl(photo: NativePhotoRef): string {
  const filmNo = photo.imageName.split('_')[0] || photo.imageName;
  return `https://apimages.nre.tas.gov.au/images/LandTasFilms/${filmNo}/Scans/${photo.imageName}.tif`;
}

export async function resolveNativeTiffOriginUrl(
  photo: NativePhotoRef,
  apiBaseUrl: string,
): Promise<string> {
  const escapedImageName = photo.imageName.replace(/'/g, "''");
  const queryParams = new URLSearchParams({
    f: 'json',
    where: `IMAGE_NAME='${escapedImageName}.tif' OR IMAGE_NAME='${escapedImageName}'`,
    outFields: 'DOWNLOAD_LINK',
    returnGeometry: 'false',
  });

  const response = await fetch(`${apiBaseUrl}/${photo.layerId}/query?${queryParams}`);
  if (!response.ok) {
    return buildNativeTiffOriginUrl(photo);
  }

  const data = (await response.json()) as {
    features?: Array<{ attributes?: { DOWNLOAD_LINK?: string } }>;
  };

  return data.features?.[0]?.attributes?.DOWNLOAD_LINK || buildNativeTiffOriginUrl(photo);
}

export function buildNativeTileManifest(
  photo: NativePhotoRef,
  origin: string,
  apiPrefix = '/api/v1',
): NativeTileManifest {
  return {
    photoId: photo.id,
    format: 'tiff-range',
    width: 0,
    height: 0,
    tileSize: 512,
    overlap: 0,
    levels: [],
    tileUrlTemplate: `${origin}${apiPrefix}/photos/${photo.encodedId}/tiles/{z}/{x}/{y}.webp`,
    source: {
      type: 'tiff',
      rangeUrl: `${origin}${apiPrefix}/photos/${photo.encodedId}/tiff`,
      supportsRange: true,
    },
  };
}

export function parseNativeTileRef(
  rawZ: string | undefined,
  rawX: string | undefined,
  rawY: string | undefined,
): NativeTileRef | null {
  const cleanY = rawY?.replace(/\.webp$/i, '');
  const z = Number(rawZ);
  const x = Number(rawX);
  const y = Number(cleanY);

  if (![z, x, y].every((value) => Number.isInteger(value) && value >= 0)) {
    return null;
  }

  return { z, x, y };
}

function buildMeta(meta?: Partial<NativeApiMeta>): NativeApiMeta {
  return {
    requestId: meta?.requestId ?? crypto.randomUUID(),
    cache: meta?.cache,
  };
}

function getBounds(rings: number[][][]): NativePhoto['bounds'] {
  const points = rings.flat();
  if (points.length === 0) return null;

  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  for (const point of points) {
    const [lng, lat] = point;
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    west = Math.min(west, lng);
    south = Math.min(south, lat);
    east = Math.max(east, lng);
    north = Math.max(north, lat);
  }

  if (![west, south, east, north].every(Number.isFinite)) return null;

  return { north, south, east, west };
}

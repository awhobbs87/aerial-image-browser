import { fromUrl } from 'geotiff';
import { buildNativeTileManifest } from '@/lib/native-api';
import type { NativePhotoRef, NativeTileManifest } from '@/lib/native-api';

const DEFAULT_TILE_SIZE = 512;

interface TiffMetadata {
  width: number;
  height: number;
}

export async function buildNativeRangeManifestFromTiff(
  photo: NativePhotoRef,
  origin: string,
  apiPrefix: string,
  tiffUrl: string,
  signal?: AbortSignal,
): Promise<NativeTileManifest> {
  const metadata = await readTiffMetadata(tiffUrl, signal);
  return {
    ...buildNativeTileManifest(photo, origin, apiPrefix),
    width: metadata.width,
    height: metadata.height,
    tileSize: DEFAULT_TILE_SIZE,
    levels: [],
  };
}

async function readTiffMetadata(tiffUrl: string, signal?: AbortSignal): Promise<TiffMetadata> {
  const tiff = await fromUrl(tiffUrl, { cache: true }, signal);
  const image = await tiff.getImage(0);
  return {
    width: image.getWidth(),
    height: image.getHeight(),
  };
}

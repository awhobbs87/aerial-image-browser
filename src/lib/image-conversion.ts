import UTIF from 'utif2';

declare global {
  class OffscreenCanvas {
    constructor(width: number, height: number);
    getContext(contextId: '2d'): OffscreenCanvasRenderingContext2D | null;
    convertToBlob(options?: { type?: string; quality?: number }): Promise<Blob>;
  }

  interface OffscreenCanvasRenderingContext2D {
    putImageData(imageData: ImageData, dx: number, dy: number): void;
    drawImage(
      image: OffscreenCanvas,
      sx: number, sy: number, sw: number, sh: number,
      dx: number, dy: number, dw: number, dh: number,
    ): void;
  }

  class ImageData {
    constructor(data: Uint8ClampedArray, width: number, height: number);
    readonly data: Uint8ClampedArray;
    readonly width: number;
    readonly height: number;
  }
}

export interface ConversionOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  maxPixels?: number;
}

const MAX_PIXELS = 20_000_000;

function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  options: ConversionOptions,
): { width: number; height: number; scale: number } {
  const { maxWidth, maxHeight, maxPixels = MAX_PIXELS } = options;
  let width = originalWidth;
  let height = originalHeight;
  const aspectRatio = width / height;

  if (maxWidth && width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / aspectRatio);
  }
  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
  }

  const totalPixels = width * height;
  if (totalPixels > maxPixels) {
    const scale = Math.sqrt(maxPixels / totalPixels);
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }

  const finalScale = width / originalWidth;
  return { width, height, scale: finalScale };
}

export async function convertTiffToWebP(
  tiffBuffer: ArrayBuffer,
  options: ConversionOptions = {},
): Promise<ArrayBuffer> {
  const { quality = 99 } = options;

  try {
    const ifds = UTIF.decode(tiffBuffer);
    if (!ifds || ifds.length === 0) {
      throw new Error('Invalid TIFF file: no image data found');
    }

    const firstImage = ifds[0];
    const originalWidth = firstImage.width;
    const originalHeight = firstImage.height;

    const { width: targetWidth, height: targetHeight, scale } =
      calculateOptimalDimensions(originalWidth, originalHeight, options);

    if (scale < 1.0) {
      console.log(
        `Downsampling: ${originalWidth}x${originalHeight} -> ${targetWidth}x${targetHeight} (${(scale * 100).toFixed(1)}%)`,
      );
    }

    UTIF.decodeImage(tiffBuffer, firstImage);
    const rgba = UTIF.toRGBA8(firstImage);

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    if (scale < 1.0) {
      const tempCanvas = new OffscreenCanvas(originalWidth, originalHeight);
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Failed to get temporary canvas context');

      const imageData = new ImageData(
        new Uint8ClampedArray(rgba),
        originalWidth,
        originalHeight,
      );
      tempCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight, 0, 0, targetWidth, targetHeight);
    } else {
      const imageData = new ImageData(
        new Uint8ClampedArray(rgba),
        originalWidth,
        originalHeight,
      );
      ctx.putImageData(imageData, 0, 0);
    }

    const blob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: quality / 100,
    });

    return await blob.arrayBuffer();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid typed array length')) {
        throw new Error(`Image too large for Workers memory (${error.message}).`);
      }
      throw new Error(`TIFF to WebP conversion failed: ${error.message}`);
    }
    throw new Error('TIFF to WebP conversion failed: Unknown error');
  }
}

export function estimateSizeReduction(tiffSize: number): number {
  return Math.round(tiffSize * 0.2);
}

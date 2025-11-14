import UTIF from "utif2";

// Type declarations for Canvas API in Workers
declare global {
  class OffscreenCanvas {
    constructor(width: number, height: number);
    getContext(contextId: "2d"): OffscreenCanvasRenderingContext2D | null;
    convertToBlob(options?: { type?: string; quality?: number }): Promise<Blob>;
  }

  interface OffscreenCanvasRenderingContext2D {
    putImageData(imageData: ImageData, dx: number, dy: number): void;
    drawImage(
      image: OffscreenCanvas,
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      dx: number,
      dy: number,
      dw: number,
      dh: number
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
  quality?: number; // 1-100, default 95 for high quality
  maxWidth?: number; // Optional max width for resizing
  maxHeight?: number; // Optional max height for resizing
  maxPixels?: number; // Maximum total pixels (default 20M = ~4800x4200)
}

// Maximum memory allocation - Workers have ~128MB memory limit
// RGBA takes 4 bytes per pixel, so 20M pixels = 80MB (leaving room for overhead)
const MAX_PIXELS = 20_000_000; // 20 million pixels (~4472x4472)

/**
 * Calculate optimal dimensions to fit within pixel and memory constraints
 */
function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  options: ConversionOptions
): { width: number; height: number; scale: number } {
  const { maxWidth, maxHeight, maxPixels = MAX_PIXELS } = options;

  let width = originalWidth;
  let height = originalHeight;
  const aspectRatio = width / height;

  // First apply explicit dimension constraints if provided
  if (maxWidth && width > maxWidth) {
    width = maxWidth;
    height = Math.round(width / aspectRatio);
  }

  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = Math.round(height * aspectRatio);
  }

  // Then check pixel budget
  const totalPixels = width * height;

  if (totalPixels > maxPixels) {
    // Calculate scale factor to fit within pixel budget
    const scale = Math.sqrt(maxPixels / totalPixels);
    width = Math.floor(width * scale);
    height = Math.floor(height * scale);
  }

  const finalScale = width / originalWidth;

  return { width, height, scale: finalScale };
}

/**
 * Convert TIFF image data to WebP format with memory-efficient processing
 * @param tiffBuffer - ArrayBuffer containing TIFF data
 * @param options - Conversion options
 * @returns ArrayBuffer containing WebP data
 */
export async function convertTiffToWebP(
  tiffBuffer: ArrayBuffer,
  options: ConversionOptions = {}
): Promise<ArrayBuffer> {
  const { quality = 95 } = options;

  try {
    // Decode TIFF metadata first (doesn't decode pixel data yet)
    const ifds = UTIF.decode(tiffBuffer);
    if (!ifds || ifds.length === 0) {
      throw new Error("Invalid TIFF file: no image data found");
    }

    // Get the first image (main image)
    const firstImage = ifds[0];
    const originalWidth = firstImage.width;
    const originalHeight = firstImage.height;
    const originalPixels = originalWidth * originalHeight;

    console.log(`Original TIFF dimensions: ${originalWidth}x${originalHeight} (${(originalPixels / 1_000_000).toFixed(1)}M pixels)`);

    // Calculate optimal output dimensions
    const { width: targetWidth, height: targetHeight, scale } = calculateOptimalDimensions(
      originalWidth,
      originalHeight,
      options
    );

    const targetPixels = targetWidth * targetHeight;

    // Check if we need to downsample to fit in memory
    if (scale < 1.0) {
      console.log(
        `Downsampling for memory: ${originalWidth}x${originalHeight} → ${targetWidth}x${targetHeight} (scale: ${(scale * 100).toFixed(1)}%)`
      );
    }

    // Decode the TIFF pixel data
    UTIF.decodeImage(tiffBuffer, firstImage);

    // Convert to RGBA (this is memory-intensive)
    console.log("Converting TIFF to RGBA...");
    const rgba = UTIF.toRGBA8(firstImage);

    console.log(`RGBA buffer size: ${(rgba.byteLength / 1024 / 1024).toFixed(2)}MB`);

    // Create canvas at target size
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // If we need to resize, do it efficiently
    if (scale < 1.0) {
      // Create temporary canvas at original size
      const tempCanvas = new OffscreenCanvas(originalWidth, originalHeight);
      const tempCtx = tempCanvas.getContext("2d");

      if (!tempCtx) {
        throw new Error("Failed to get temporary canvas context");
      }

      // Put full-resolution image data in temporary canvas
      const imageData = new ImageData(
        new Uint8ClampedArray(rgba),
        originalWidth,
        originalHeight
      );
      tempCtx.putImageData(imageData, 0, 0);

      // Draw downscaled version to target canvas
      ctx.drawImage(
        tempCanvas,
        0, 0, originalWidth, originalHeight,
        0, 0, targetWidth, targetHeight
      );
    } else {
      // No resize needed, just put the image data
      const imageData = new ImageData(
        new Uint8ClampedArray(rgba),
        originalWidth,
        originalHeight
      );
      ctx.putImageData(imageData, 0, 0);
    }

    // Convert to WebP blob
    console.log("Converting to WebP...");
    const blob = await canvas.convertToBlob({
      type: "image/webp",
      quality: quality / 100, // Convert 1-100 to 0-1
    });

    console.log(`WebP size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);

    // Convert blob to ArrayBuffer
    return await blob.arrayBuffer();
  } catch (error) {
    // Provide more detailed error messages
    if (error instanceof Error) {
      if (error.message.includes("Invalid typed array length")) {
        throw new Error(
          `Image too large for Workers memory (${error.message}). Try with smaller images or increase memory limits.`
        );
      }
      throw new Error(`TIFF to WebP conversion failed: ${error.message}`);
    }
    throw new Error("TIFF to WebP conversion failed: Unknown error");
  }
}

/**
 * Get estimated WebP size reduction compared to TIFF
 * This is a rough estimate for logging/monitoring purposes
 */
export function estimateSizeReduction(tiffSize: number): number {
  // WebP typically achieves 70-90% reduction for aerial photos
  return Math.round(tiffSize * 0.2); // Estimate 80% reduction
}

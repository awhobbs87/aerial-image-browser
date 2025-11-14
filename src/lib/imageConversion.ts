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
}

/**
 * Convert TIFF image data to WebP format
 * @param tiffBuffer - ArrayBuffer containing TIFF data
 * @param options - Conversion options
 * @returns ArrayBuffer containing WebP data
 */
export async function convertTiffToWebP(
  tiffBuffer: ArrayBuffer,
  options: ConversionOptions = {}
): Promise<ArrayBuffer> {
  const { quality = 95, maxWidth, maxHeight } = options;

  try {
    // Decode TIFF
    const ifds = UTIF.decode(tiffBuffer);
    if (!ifds || ifds.length === 0) {
      throw new Error("Invalid TIFF file: no image data found");
    }

    // Get the first image (main image)
    const firstImage = ifds[0];
    UTIF.decodeImage(tiffBuffer, firstImage);

    // Get image dimensions
    let width = firstImage.width;
    let height = firstImage.height;

    // Calculate resize dimensions if needed
    if (maxWidth || maxHeight) {
      const aspectRatio = width / height;

      if (maxWidth && width > maxWidth) {
        width = maxWidth;
        height = Math.round(width / aspectRatio);
      }

      if (maxHeight && height > maxHeight) {
        height = maxHeight;
        width = Math.round(height * aspectRatio);
      }
    }

    // Convert to RGBA if needed
    const rgba = UTIF.toRGBA8(firstImage);

    // Create an OffscreenCanvas for WebP encoding
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Failed to get canvas context");
    }

    // Create ImageData from RGBA buffer
    const imageData = new ImageData(
      new Uint8ClampedArray(rgba),
      firstImage.width,
      firstImage.height
    );

    // If resizing is needed, draw with scaling
    if (width !== firstImage.width || height !== firstImage.height) {
      // Create temporary canvas at original size
      const tempCanvas = new OffscreenCanvas(firstImage.width, firstImage.height);
      const tempCtx = tempCanvas.getContext("2d");

      if (!tempCtx) {
        throw new Error("Failed to get temporary canvas context");
      }

      tempCtx.putImageData(imageData, 0, 0);

      // Draw scaled version to final canvas
      ctx.drawImage(tempCanvas, 0, 0, width, height);
    } else {
      // No resize needed, just put the image data
      ctx.putImageData(imageData, 0, 0);
    }

    // Convert to WebP blob
    const blob = await canvas.convertToBlob({
      type: "image/webp",
      quality: quality / 100, // Convert 1-100 to 0-1
    });

    // Convert blob to ArrayBuffer
    return await blob.arrayBuffer();
  } catch (error) {
    throw new Error(
      `TIFF to WebP conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
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

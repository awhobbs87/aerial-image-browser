/**
 * Web Worker for TIFF to WebP conversion
 * Runs in background thread to avoid blocking UI
 */

// This will be handled by vite-plugin-worker
import UTIF from 'utif2';

export interface ConversionMessage {
  type: 'convert';
  tiffBuffer: ArrayBuffer;
  quality?: number;
  maxPixels?: number;
}

export interface ConversionResult {
  type: 'success' | 'error' | 'progress';
  webpBuffer?: ArrayBuffer;
  error?: string;
  progress?: number;
  width?: number;
  height?: number;
}

// Maximum memory allocation (increased for better quality)
const MAX_PIXELS = 50_000_000; // 50 million pixels (allows ~7000x7000 images)

self.onmessage = async (e: MessageEvent<ConversionMessage>) => {
  const { tiffBuffer, quality = 100, maxPixels = MAX_PIXELS } = e.data; // Increased default quality to 100 (lossless)

  try {
    postMessage({ type: 'progress', progress: 10 } as ConversionResult);

    // Decode TIFF metadata
    const ifds = UTIF.decode(tiffBuffer);
    if (!ifds || ifds.length === 0) {
      throw new Error('Invalid TIFF file: no image data found');
    }

    const firstImage = ifds[0];
    const originalWidth = firstImage.width;
    const originalHeight = firstImage.height;
    const originalPixels = originalWidth * originalHeight;

    console.log(`[Worker] Original: ${originalWidth}x${originalHeight} (${(originalPixels / 1_000_000).toFixed(1)}M pixels)`);

    postMessage({ type: 'progress', progress: 30 } as ConversionResult);

    // Calculate optimal dimensions
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;
    const aspectRatio = originalWidth / originalHeight;

    const totalPixels = targetWidth * targetHeight;
    if (totalPixels > maxPixels) {
      const scale = Math.sqrt(maxPixels / totalPixels);
      targetWidth = Math.floor(originalWidth * scale);
      targetHeight = Math.floor(originalHeight * scale);
      console.log(`[Worker] Downsampling: ${originalWidth}x${originalHeight} → ${targetWidth}x${targetHeight}`);
    }

    postMessage({ type: 'progress', progress: 50 } as ConversionResult);

    // Decode pixel data
    UTIF.decodeImage(tiffBuffer, firstImage);
    const rgba = UTIF.toRGBA8(firstImage);

    postMessage({ type: 'progress', progress: 70 } as ConversionResult);

    // Create canvas and convert
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    if (targetWidth !== originalWidth || targetHeight !== originalHeight) {
      // Resize needed
      const tempCanvas = new OffscreenCanvas(originalWidth, originalHeight);
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Failed to get temp canvas context');

      const imageData = new ImageData(new Uint8ClampedArray(rgba), originalWidth, originalHeight);
      tempCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, originalWidth, originalHeight, 0, 0, targetWidth, targetHeight);
    } else {
      // No resize
      const imageData = new ImageData(new Uint8ClampedArray(rgba), originalWidth, originalHeight);
      ctx.putImageData(imageData, 0, 0);
    }

    postMessage({ type: 'progress', progress: 90 } as ConversionResult);

    // Convert to WebP with high quality
    // Note: quality 1.0 produces lossless WebP which preserves maximum detail
    const blob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: quality / 100, // 100 = lossless, 99 = near-lossless
    });

    const webpBuffer = await blob.arrayBuffer();

    console.log(`[Worker] WebP size: ${(webpBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);

    postMessage({
      type: 'success',
      webpBuffer,
      width: targetWidth,
      height: targetHeight,
      progress: 100,
    } as ConversionResult, [webpBuffer]);

  } catch (error) {
    console.error('[Worker] Conversion error:', error);
    postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ConversionResult);
  }
};

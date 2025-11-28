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
  format?: 'webp' | 'png'; // Allow format selection
}

export interface ConversionResult {
  type: 'success' | 'error' | 'progress';
  webpBuffer?: ArrayBuffer;
  error?: string;
  progress?: number;
  width?: number;
  height?: number;
  format?: string;
}

// Maximum memory allocation (increased for maximum quality)
// Note: Modern browsers can handle large canvases. 100M pixels = ~10000x10000 images
const MAX_PIXELS = 100_000_000; // 100 million pixels for ultra-high resolution support

self.onmessage = async (e: MessageEvent<ConversionMessage>) => {
  const { tiffBuffer, quality = 100, maxPixels = MAX_PIXELS, format = 'png' } = e.data; // Default to PNG for maximum quality

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
    const ctx = canvas.getContext('2d', {
      // Disable alpha for better performance if not needed
      // alpha: false,
      // High-quality rendering
      willReadFrequently: false,
    });

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Disable image smoothing for pixel-perfect rendering (sharper)
    ctx.imageSmoothingEnabled = false;

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

    // Convert to selected format (PNG for max quality, WebP for smaller size)
    let outputBuffer: ArrayBuffer;
    let outputFormat: string;

    if (format === 'png') {
      // PNG: Truly lossless, no compression artifacts, maximum sharpness
      // Larger file size but absolutely no quality loss
      console.log('[Worker] Using PNG format for maximum quality');
      const blob = await canvas.convertToBlob({
        type: 'image/png',
      });
      outputBuffer = await blob.arrayBuffer();
      outputFormat = 'png';
      console.log(`[Worker] PNG size: ${(outputBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
    } else {
      // WebP: Good quality with smaller file size
      console.log('[Worker] Using WebP format');
      const blob = await canvas.convertToBlob({
        type: 'image/webp',
        quality: quality / 100, // 100 = lossless, 99 = near-lossless
      });
      outputBuffer = await blob.arrayBuffer();
      outputFormat = 'webp';
      console.log(`[Worker] WebP size: ${(outputBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`);
    }

    postMessage({
      type: 'success',
      webpBuffer: outputBuffer, // Keep name for compatibility
      width: targetWidth,
      height: targetHeight,
      format: outputFormat,
      progress: 100,
    } as ConversionResult, [outputBuffer]);

  } catch (error) {
    console.error('[Worker] Conversion error:', error);
    postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    } as ConversionResult);
  }
};

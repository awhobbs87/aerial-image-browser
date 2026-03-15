/**
 * Web Worker for client-side TIFF-to-WebP conversion.
 * Uses utif2 to decode TIFF and OffscreenCanvas for WebP encoding.
 * Runs in a separate thread to avoid blocking the UI.
 */

import UTIF from 'utif2';

interface ConvertMessage {
  type: 'convert';
  buffer: ArrayBuffer;
  quality?: number;
  maxPixels?: number;
}

interface ProgressMessage {
  type: 'progress';
  stage: string;
  percent: number;
}

interface CompleteMessage {
  type: 'complete';
  buffer: ArrayBuffer;
  width: number;
  height: number;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

const MAX_PIXELS = 20_000_000;

self.onmessage = async (event: MessageEvent<ConvertMessage>) => {
  const { buffer, quality = 95, maxPixels = MAX_PIXELS } = event.data;

  try {
    postProgress('Decoding TIFF...', 10);

    const ifds = UTIF.decode(buffer);
    if (!ifds || ifds.length === 0) {
      throw new Error('Invalid TIFF file');
    }

    const firstImage = ifds[0];
    const origW = firstImage.width;
    const origH = firstImage.height;

    postProgress('Converting pixels...', 30);
    UTIF.decodeImage(buffer, firstImage);
    const rgba = UTIF.toRGBA8(firstImage);

    // Calculate target dimensions
    let targetW = origW;
    let targetH = origH;
    const totalPixels = targetW * targetH;

    if (totalPixels > maxPixels) {
      const scale = Math.sqrt(maxPixels / totalPixels);
      targetW = Math.floor(targetW * scale);
      targetH = Math.floor(targetH * scale);
    }

    postProgress('Rendering to canvas...', 60);
    const canvas = new OffscreenCanvas(targetW, targetH);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    if (targetW !== origW || targetH !== origH) {
      const tempCanvas = new OffscreenCanvas(origW, origH);
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) throw new Error('Failed to get temp canvas context');
      const imageData = new ImageData(new Uint8ClampedArray(rgba), origW, origH);
      tempCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(tempCanvas, 0, 0, origW, origH, 0, 0, targetW, targetH);
    } else {
      const imageData = new ImageData(new Uint8ClampedArray(rgba), origW, origH);
      ctx.putImageData(imageData, 0, 0);
    }

    postProgress('Encoding WebP...', 80);
    const blob = await canvas.convertToBlob({
      type: 'image/webp',
      quality: quality / 100,
    });

    const result = await blob.arrayBuffer();

    postProgress('Complete', 100);

    const msg: CompleteMessage = {
      type: 'complete',
      buffer: result,
      width: targetW,
      height: targetH,
    };
    self.postMessage(msg, { transfer: [result] });
  } catch (err) {
    const msg: ErrorMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : 'Unknown conversion error',
    };
    self.postMessage(msg);
  }
};

function postProgress(stage: string, percent: number) {
  const msg: ProgressMessage = { type: 'progress', stage, percent };
  self.postMessage(msg);
}

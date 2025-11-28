import { useState, useCallback, useRef, useEffect } from 'react';
import type { ConversionResult } from '../workers/tiffConversion.worker';
import apiClient from '../lib/apiClient';

export interface ConversionState {
  converting: boolean;
  progress: number;
  error: string | null;
  convertedImageUrl: string | null;
  imageWidth?: number;
  imageHeight?: number;
}

export interface ConversionOptions {
  quality?: number;
  imageName?: string;
  layerId?: number;
  uploadToR2?: boolean;
  format?: 'webp' | 'png'; // Allow format selection
}

export function useTiffConversion() {
  const [state, setState] = useState<ConversionState>({
    converting: false,
    progress: 0,
    error: null,
    convertedImageUrl: null,
  });

  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/tiffConversion.worker.ts', import.meta.url),
      { type: 'module' }
    );

    workerRef.current.onmessage = async (e: MessageEvent<ConversionResult>) => {
      const result = e.data;

      if (result.type === 'progress') {
        setState(prev => ({ ...prev, progress: result.progress || 0 }));
      } else if (result.type === 'success' && result.webpBuffer) {
        // Use the format from the result, default to PNG
        const mimeType = result.format === 'webp' ? 'image/webp' : 'image/png';
        const blob = new Blob([result.webpBuffer], { type: mimeType });
        const url = URL.createObjectURL(blob);

        // Upload to R2 cache in background (don't wait)
        const worker = workerRef.current;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (worker && (worker as any).dataset) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { imageName, layerId } = (worker as any).dataset;
          if (imageName && layerId !== undefined) {
            console.log(`[useTiffConversion] Uploading WebP to R2 cache for ${imageName}`);
            apiClient.uploadWebPToCache(imageName, layerId, result.webpBuffer).then(
              (uploadResult) => {
                if (uploadResult.success) {
                  console.log(`[useTiffConversion] Successfully cached WebP in R2 for ${imageName}`);
                } else {
                  console.warn(`[useTiffConversion] Failed to cache WebP in R2: ${uploadResult.error}`);
                }
              }
            ).catch((err) => {
              console.error(`[useTiffConversion] Error uploading to R2:`, err);
            });
          }
        }

        setState({
          converting: false,
          progress: 100,
          error: null,
          convertedImageUrl: url,
          imageWidth: result.width,
          imageHeight: result.height,
        });
      } else if (result.type === 'error') {
        setState(prev => ({
          ...prev,
          converting: false,
          error: result.error || 'Conversion failed',
        }));
      }
    };

    workerRef.current.onerror = (error) => {
      console.error('[Worker] Error:', error);
      setState(prev => ({
        ...prev,
        converting: false,
        error: 'Worker error occurred',
      }));
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const convertTiff = useCallback(async (tiffUrl: string, options: ConversionOptions = {}) => {
    const { quality = 100, imageName, layerId, uploadToR2 = true, format = 'png' } = options;

    if (!workerRef.current) {
      setState(prev => ({ ...prev, error: 'Worker not initialized' }));
      return;
    }

    setState({
      converting: true,
      progress: 0,
      error: null,
      convertedImageUrl: null,
    });

    try {
      // Fetch TIFF data
      const response = await fetch(tiffUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch TIFF: ${response.statusText}`);
      }

      const tiffBuffer = await response.arrayBuffer();

      // Store metadata for R2 upload later
      if (uploadToR2 && imageName && layerId !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        workerRef.current.dataset = { imageName, layerId } as any;
      }

      // Send to worker
      workerRef.current.postMessage({
        type: 'convert',
        tiffBuffer,
        quality,
        format, // Pass format selection to worker
      }, [tiffBuffer]); // Transfer ownership

    } catch (error) {
      console.error('Conversion error:', error);
      setState(prev => ({
        ...prev,
        converting: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
      }));
    }
  }, []);

  const cleanup = useCallback(() => {
    if (state.convertedImageUrl && state.convertedImageUrl.startsWith('blob:')) {
      URL.revokeObjectURL(state.convertedImageUrl);
    }
    setState({
      converting: false,
      progress: 0,
      error: null,
      convertedImageUrl: null,
    });
  }, [state.convertedImageUrl]);

  return {
    ...state,
    convertTiff,
    cleanup,
  };
}

import { useState, useCallback } from 'react';
import { api } from '@/lib/api-client';

interface ConversionResult {
  url: string;
  format: string;
  originalSize?: number;
  convertedSize?: number;
  duration?: number;
}

interface ConversionState {
  status: 'idle' | 'checking' | 'converting' | 'complete' | 'error';
  result: ConversionResult | null;
  error: string | null;
  progress: string;
}

interface ServiceHealth {
  available: boolean;
  status?: string;
}

export function useTiffConversion() {
  const [state, setState] = useState<ConversionState>({
    status: 'idle',
    result: null,
    error: null,
    progress: '',
  });

  const checkHealth = useCallback(async (): Promise<ServiceHealth> => {
    try {
      const response = await api.get<{ success: boolean; available: boolean; status?: string }>(
        '/api/convert/tiff-health',
      );
      return { available: response.available, status: response.status };
    } catch {
      return { available: false };
    }
  }, []);

  const convertFromUrl = useCallback(
    async (tiffUrl: string) => {
      setState({
        status: 'checking',
        result: null,
        error: null,
        progress: 'Checking conversion service...',
      });

      try {
        const health = await checkHealth();
        if (!health.available) {
          setState({
            status: 'error',
            result: null,
            error: 'TIFF conversion service is unavailable',
            progress: '',
          });
          return null;
        }

        setState((s) => ({ ...s, status: 'converting', progress: 'Converting TIFF to WebP...' }));

        const response = await api.post<{
          success: boolean;
          url?: string;
          format?: string;
          originalSize?: number;
          convertedSize?: number;
          duration?: number;
          error?: string;
        }>('/api/convert/tiff-url', { url: tiffUrl });

        if (response.success && response.url) {
          const result: ConversionResult = {
            url: response.url,
            format: response.format || 'webp',
            originalSize: response.originalSize,
            convertedSize: response.convertedSize,
            duration: response.duration,
          };
          setState({ status: 'complete', result, error: null, progress: '' });
          return result;
        } else {
          setState({
            status: 'error',
            result: null,
            error: response.error || 'Conversion failed',
            progress: '',
          });
          return null;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Conversion failed';
        setState({ status: 'error', result: null, error: message, progress: '' });
        return null;
      }
    },
    [checkHealth],
  );

  const convertFromFile = useCallback(
    async (file: File) => {
      setState({
        status: 'checking',
        result: null,
        error: null,
        progress: 'Checking conversion service...',
      });

      try {
        const health = await checkHealth();
        if (!health.available) {
          setState({
            status: 'error',
            result: null,
            error: 'TIFF conversion service is unavailable',
            progress: '',
          });
          return null;
        }

        setState((s) => ({
          ...s,
          status: 'converting',
          progress: `Uploading and converting ${file.name}...`,
        }));

        const formData = new FormData();
        formData.append('file', file);

        const response = await api.postFormData<{
          success: boolean;
          url?: string;
          format?: string;
          originalSize?: number;
          convertedSize?: number;
          duration?: number;
          error?: string;
        }>('/api/convert/tiff-upload', formData);

        if (response.success && response.url) {
          const result: ConversionResult = {
            url: response.url,
            format: response.format || 'webp',
            originalSize: response.originalSize,
            convertedSize: response.convertedSize,
            duration: response.duration,
          };
          setState({ status: 'complete', result, error: null, progress: '' });
          return result;
        } else {
          setState({
            status: 'error',
            result: null,
            error: response.error || 'Conversion failed',
            progress: '',
          });
          return null;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Conversion failed';
        setState({ status: 'error', result: null, error: message, progress: '' });
        return null;
      }
    },
    [checkHealth],
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', result: null, error: null, progress: '' });
  }, []);

  return {
    ...state,
    convertFromUrl,
    convertFromFile,
    checkHealth,
    reset,
  };
}

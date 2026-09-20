import { useRef } from 'react';
import {
  CheckCircleIcon,
  FileImageIcon,
  UploadSimpleIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { Button, LinkButton } from '@cloudflare/kumo/components/button';
import { LayerCard } from '@cloudflare/kumo/components/layer-card';
import { Meter } from '@cloudflare/kumo/components/meter';
import { useTiffConversion } from '@/hooks/useTiffConversion';
import { formatFileSize } from '@/lib/format';

interface TiffConverterProps {
  tiffUrl?: string;
  onConversionComplete?: (webpUrl: string) => void;
}

export function TiffConverter({ tiffUrl, onConversionComplete }: TiffConverterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { status, result, error, progress, convertFromUrl, convertFromFile, reset } =
    useTiffConversion();

  const handleConvertUrl = async () => {
    if (!tiffUrl) return;
    const convResult = await convertFromUrl(tiffUrl);
    if (convResult) onConversionComplete?.(convResult.url);
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    const convResult = await convertFromFile(file);
    if (convResult) onConversionComplete?.(convResult.url);
  };

  return (
    <LayerCard className="p-4">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">TIFF Conversion</h3>

        {status === 'idle' && (
          <div className="flex flex-wrap gap-2">
            {tiffUrl && (
              <Button
                type="button"
                onClick={handleConvertUrl}
                icon={FileImageIcon}
                variant="secondary"
              >
                Convert to WebP
              </Button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".tif,.tiff"
              className="hidden"
              onChange={(e) => handleFileUpload(e.currentTarget.files?.[0] ?? null)}
            />
            <Button
              type="button"
              onClick={() => inputRef.current?.click()}
              icon={UploadSimpleIcon}
              variant="secondary"
            >
              Upload TIFF
            </Button>
          </div>
        )}

        {(status === 'checking' || status === 'converting') && (
          <div className="flex flex-col gap-2">
            <Meter label={progress} value={status === 'checking' ? 30 : 70} showValue={false} />
          </div>
        )}

        {status === 'complete' && result && (
          <div className="rounded-2xl border border-sky-600/20 bg-sky-50 p-3 text-sky-950 dark:bg-sky-950/25 dark:text-sky-100">
            <div className="flex gap-2">
              <CheckCircleIcon size={16} className="mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold">Conversion complete</p>
                {result.originalSize && result.convertedSize && (
                  <p className="mt-1 text-xs">
                    {formatFileSize(result.originalSize)} TIFF to{' '}
                    {formatFileSize(result.convertedSize)} WebP (
                    {Math.round((1 - result.convertedSize / result.originalSize) * 100)}% reduction)
                  </p>
                )}
                {result.duration && (
                  <p className="mt-1 text-xs">
                    Completed in {(result.duration / 1000).toFixed(1)}s
                  </p>
                )}
                <div className="mt-2 flex gap-2">
                  <LinkButton
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    variant="primary"
                    size="sm"
                  >
                    View converted image
                  </LinkButton>
                  <Button type="button" onClick={reset} variant="secondary" size="sm">
                    Convert another
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-2xl border border-red-500/20 bg-red-50 p-3 text-red-950 dark:bg-red-950/30 dark:text-red-100">
            <div className="flex gap-2">
              <WarningIcon size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold">Conversion failed</p>
                <p className="mt-1 text-xs">{error}</p>
                <Button
                  type="button"
                  onClick={reset}
                  variant="destructive"
                  size="sm"
                  className="mt-2"
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LayerCard>
  );
}

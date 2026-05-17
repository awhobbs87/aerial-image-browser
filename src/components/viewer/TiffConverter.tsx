import { useRef } from 'react';
import { IconFileTypography, IconUpload, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
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
    <div className="rounded-2xl border border-slate-950/10 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-950 dark:text-slate-50">TIFF Conversion</h3>

        {status === 'idle' && (
          <div className="flex flex-wrap gap-2">
            {tiffUrl && (
              <button
                type="button"
                onClick={handleConvertUrl}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-sky-600/10 px-3 text-sm font-bold text-sky-700 transition hover:bg-sky-600/15 dark:text-sky-300"
              >
                <IconFileTypography size={16} />
                Convert to WebP
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".tif,.tiff"
              className="hidden"
              onChange={(e) => handleFileUpload(e.currentTarget.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-950/10 px-3 text-sm font-bold text-slate-700 transition hover:bg-slate-950/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <IconUpload size={16} />
              Upload TIFF
            </button>
          </div>
        )}

        {(status === 'checking' || status === 'converting') && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">{progress}</p>
            <div className="h-2 overflow-hidden rounded-full bg-slate-950/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-sky-600 transition-all"
                style={{ width: `${status === 'checking' ? 30 : 70}%` }}
              />
            </div>
          </div>
        )}

        {status === 'complete' && result && (
          <div className="rounded-2xl border border-sky-600/20 bg-sky-50 p-3 text-sky-950 dark:bg-sky-950/25 dark:text-sky-100">
            <div className="flex gap-2">
              <IconCheck size={16} className="mt-0.5 shrink-0" />
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
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-sky-600 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    View converted image
                  </a>
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-full px-3 py-1.5 text-xs font-bold"
                  >
                    Convert another
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-2xl border border-red-500/20 bg-red-50 p-3 text-red-950 dark:bg-red-950/30 dark:text-red-100">
            <div className="flex gap-2">
              <IconAlertTriangle size={16} className="mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold">Conversion failed</p>
                <p className="mt-1 text-xs">{error}</p>
                <button
                  type="button"
                  onClick={reset}
                  className="mt-2 rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

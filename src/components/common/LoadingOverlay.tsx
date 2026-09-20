import { Loader } from '@cloudflare/kumo/components/loader';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  fullPage?: boolean;
}

export function LoadingOverlay({ visible, message, fullPage = false }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div
      className={
        fullPage
          ? 'fixed inset-0 z-9999 flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-slate-950/70'
          : 'absolute inset-0 z-100 flex items-center justify-center bg-white/50 backdrop-blur-[2px] dark:bg-slate-950/50'
      }
    >
      <div className="flex flex-col items-center gap-3">
        <Loader size="lg" aria-label={message || 'Loading'} />
        {message && (
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{message}</p>
        )}
      </div>
    </div>
  );
}

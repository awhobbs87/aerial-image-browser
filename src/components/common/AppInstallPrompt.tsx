import { useState, useEffect } from 'react';
import { DownloadSimpleIcon, XIcon } from '@phosphor-icons/react';
import { Button } from '@cloudflare/kumo/components/button';
import { LayerCard } from '@cloudflare/kumo/components/layer-card';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('pwa-install-dismissed') === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined' || dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [dismissed]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <LayerCard className="fixed bottom-20 left-1/2 z-1000 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 p-3 shadow-xl backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <DownloadSimpleIcon size={20} className="shrink-0 text-kumo-accent" />
          <div className="min-w-0">
            <p className="text-sm font-bold">Install App</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              Add to home screen for quick access
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" onClick={handleInstall} variant="primary" size="sm">
            Install
          </Button>
          <Button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            icon={XIcon}
            variant="ghost"
            shape="square"
            size="sm"
          />
        </div>
      </div>
    </LayerCard>
  );
}

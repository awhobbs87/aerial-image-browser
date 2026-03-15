import { useState, useEffect } from 'react';
import { Paper, Group, Text, Button, CloseButton } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';

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
    if (typeof window === 'undefined') return;
    if (dismissed) return;

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
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <Paper
      p="sm"
      shadow="lg"
      radius="lg"
      style={{
        position: 'fixed',
        bottom: 80,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        maxWidth: 360,
        width: 'calc(100% - 2rem)',
      }}
      withBorder
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="sm" wrap="nowrap">
          <IconDownload size={20} />
          <div>
            <Text size="sm" fw={600}>
              Install App
            </Text>
            <Text size="xs" c="dimmed">
              Add to home screen for quick access
            </Text>
          </div>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <Button size="xs" onClick={handleInstall}>
            Install
          </Button>
          <CloseButton size="sm" onClick={handleDismiss} aria-label="Dismiss" />
        </Group>
      </Group>
    </Paper>
  );
}

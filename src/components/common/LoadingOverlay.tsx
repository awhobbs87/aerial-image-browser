import { Overlay, Center, Stack, Loader, Text } from '@mantine/core';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  fullPage?: boolean;
}

export function LoadingOverlay({ visible, message, fullPage = false }: LoadingOverlayProps) {
  if (!visible) return null;

  const content = (
    <Center style={{ height: '100%', width: '100%' }}>
      <Stack align="center" gap="md">
        <Loader size="lg" color="emerald" />
        {message && (
          <Text size="sm" c="dimmed">
            {message}
          </Text>
        )}
      </Stack>
    </Center>
  );

  if (fullPage) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Overlay backgroundOpacity={0.6} blur={4} zIndex={-1} />
        {content}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Overlay backgroundOpacity={0.4} blur={2} zIndex={-1} />
      {content}
    </div>
  );
}

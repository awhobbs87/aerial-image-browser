import { Button, Paper, Stack, Text, Progress, Alert, Group, FileButton } from '@mantine/core';
import { IconFileTypography, IconUpload, IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { useTiffConversion } from '@/hooks/useTiffConversion';
import { formatFileSize } from '@/lib/format';

interface TiffConverterProps {
  tiffUrl?: string;
  onConversionComplete?: (webpUrl: string) => void;
}

export function TiffConverter({ tiffUrl, onConversionComplete }: TiffConverterProps) {
  const { status, result, error, progress, convertFromUrl, convertFromFile, reset } = useTiffConversion();

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
    <Paper p="md" radius="md" withBorder>
      <Stack gap="sm">
        <Text size="sm" fw={600}>TIFF Conversion</Text>

        {status === 'idle' && (
          <Group gap="sm">
            {tiffUrl && (
              <Button
                leftSection={<IconFileTypography size={16} />}
                size="sm"
                variant="light"
                onClick={handleConvertUrl}
              >
                Convert to WebP
              </Button>
            )}
            <FileButton onChange={handleFileUpload} accept=".tif,.tiff">
              {(props) => (
                <Button {...props} leftSection={<IconUpload size={16} />} size="sm" variant="outline">
                  Upload TIFF
                </Button>
              )}
            </FileButton>
          </Group>
        )}

        {(status === 'checking' || status === 'converting') && (
          <Stack gap="xs">
            <Text size="xs" c="dimmed">{progress}</Text>
            <Progress value={status === 'checking' ? 30 : 70} animated color="emerald" />
          </Stack>
        )}

        {status === 'complete' && result && (
          <Alert icon={<IconCheck size={16} />} color="green" variant="light" title="Conversion complete">
            <Stack gap={4}>
              {result.originalSize && result.convertedSize && (
                <Text size="xs">
                  {formatFileSize(result.originalSize)} TIFF to {formatFileSize(result.convertedSize)} WebP
                  ({Math.round((1 - result.convertedSize / result.originalSize) * 100)}% reduction)
                </Text>
              )}
              {result.duration && <Text size="xs">Completed in {(result.duration / 1000).toFixed(1)}s</Text>}
              <Group gap="sm" mt="xs">
                <Button size="xs" component="a" href={result.url} target="_blank" variant="light">
                  View converted image
                </Button>
                <Button size="xs" variant="subtle" onClick={reset}>
                  Convert another
                </Button>
              </Group>
            </Stack>
          </Alert>
        )}

        {status === 'error' && (
          <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light" title="Conversion failed">
            <Stack gap="xs">
              <Text size="xs">{error}</Text>
              <Button size="xs" variant="light" color="red" onClick={reset}>
                Try again
              </Button>
            </Stack>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}

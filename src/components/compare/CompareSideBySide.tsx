import { Stack, Text, Paper, Image } from '@mantine/core';
import type { EnhancedPhoto } from '@/types/photo';
import classes from './CompareSideBySide.module.css';

interface CompareSideBySideProps {
  photoA: EnhancedPhoto;
  photoB: EnhancedPhoto;
}

export function CompareSideBySide({ photoA, photoB }: CompareSideBySideProps) {
  return (
    <div className={classes.container}>
      <div className={classes.pane}>
        <Image
          src={`/api/images/thumbnail/${photoA.layerId}/${photoA.name}`}
          alt={photoA.name}
          fit="contain"
          h="100%"
          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23e0e0e0' width='400' height='300'/%3E%3C/svg%3E"
        />
        <Paper className={classes.label} px="sm" py="xs" radius="sm">
          <Stack gap={2}>
            <Text size="sm" fw={600}>
              {photoA.name}
            </Text>
            <Text size="xs" c="dimmed">
              {photoA.year} | Scale 1:{photoA.scale?.toLocaleString()}
            </Text>
          </Stack>
        </Paper>
      </div>
      <div className={classes.pane}>
        <Image
          src={`/api/images/thumbnail/${photoB.layerId}/${photoB.name}`}
          alt={photoB.name}
          fit="contain"
          h="100%"
          fallbackSrc="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23e0e0e0' width='400' height='300'/%3E%3C/svg%3E"
        />
        <Paper className={classes.label} px="sm" py="xs" radius="sm">
          <Stack gap={2}>
            <Text size="sm" fw={600}>
              {photoB.name}
            </Text>
            <Text size="xs" c="dimmed">
              {photoB.year} | Scale 1:{photoB.scale?.toLocaleString()}
            </Text>
          </Stack>
        </Paper>
      </div>
    </div>
  );
}

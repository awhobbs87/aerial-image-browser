import { Card, Skeleton, Group, Stack } from '@mantine/core';

interface PhotoSkeletonProps {
  count?: number;
}

export function PhotoSkeleton({ count = 6 }: PhotoSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} shadow="sm" radius="md" padding={0}>
          <Skeleton height={0} style={{ paddingBottom: '75%' }} radius={0} />
          <Stack gap="xs" p="sm">
            <Skeleton height={16} width="70%" />
            <Group gap="xs">
              <Skeleton height={14} width={60} />
              <Skeleton height={14} width={80} />
            </Group>
          </Stack>
        </Card>
      ))}
    </>
  );
}

import { Skeleton } from '@mantine/core';

interface PhotoSkeletonProps {
  count?: number;
}

export function PhotoSkeleton({ count = 6 }: PhotoSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton height={0} style={{ paddingBottom: '75%', borderRadius: 6 }} radius={0} />
          <div style={{ padding: '8px 2px 4px', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Skeleton height={13} width="60%" radius={4} />
            <Skeleton height={11} width="40%" radius={4} />
          </div>
        </div>
      ))}
    </>
  );
}

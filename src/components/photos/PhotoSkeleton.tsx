import { LayerCard } from '@cloudflare/kumo/components/layer-card';
import { SkeletonLine } from '@cloudflare/kumo/components/loader';

interface PhotoSkeletonProps {
  count?: number;
}

export function PhotoSkeleton({ count = 6 }: PhotoSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <LayerCard key={i} className="rounded-2xl p-2">
          <div className="aspect-4/3 rounded-[8px] bg-slate-950/10 dark:bg-white/10" />
          <div className="flex flex-col gap-1 px-0.5 py-2">
            <SkeletonLine minWidth={55} maxWidth={65} blockHeight={20} />
            <SkeletonLine minWidth={35} maxWidth={45} blockHeight={12} />
          </div>
        </LayerCard>
      ))}
    </>
  );
}

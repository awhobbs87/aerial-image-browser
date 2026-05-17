interface PhotoSkeletonProps {
  count?: number;
}

export function PhotoSkeleton({ count = 6 }: PhotoSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-4/3 rounded-md bg-slate-950/10 dark:bg-white/10" />
          <div className="flex flex-col gap-1 px-0.5 py-2">
            <div className="h-3.5 w-3/5 rounded bg-slate-950/10 dark:bg-white/10" />
            <div className="h-3 w-2/5 rounded bg-slate-950/10 dark:bg-white/10" />
          </div>
        </div>
      ))}
    </>
  );
}

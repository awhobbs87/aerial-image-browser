import { photoImageUrl, photoCardSources } from '@/lib/photo-images';
import { useMemo, useRef } from 'react';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import { Badge } from '@cloudflare/kumo/components/badge';
import { Button } from '@cloudflare/kumo/components/button';
import { LayerCard } from '@cloudflare/kumo/components/layer-card';
import type { EnhancedPhoto } from '@/types/photo';

interface PhotoTimelineProps {
  photos: EnhancedPhoto[];
  isLoading: boolean;
  onPhotoClick?: (photo: EnhancedPhoto) => void;
}

export function PhotoTimeline({ photos, isLoading, onPhotoClick }: PhotoTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const groupedByYear = useMemo(() => {
    const groups: Map<number, EnhancedPhoto[]> = new Map();
    for (const photo of photos) {
      const year = photo.year || 0;
      if (!groups.has(year)) groups.set(year, []);
      groups.get(year)!.push(photo);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [photos]);

  const years = groupedByYear.map(([year]) => year);

  const scrollToYear = (year: number) => {
    document.getElementById(`timeline-year-${year}`)?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
      block: 'start',
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-950/10 dark:bg-white/10" />
            <div className="min-w-0 flex-1">
              <div className="mb-2 h-4 w-20 animate-pulse rounded bg-slate-950/10 dark:bg-white/10" />
              <div className="flex gap-2 overflow-hidden">
                <div className="h-24 w-32 shrink-0 animate-pulse rounded-lg bg-slate-950/10 dark:bg-white/10" />
                <div className="h-24 w-32 shrink-0 animate-pulse rounded-lg bg-slate-950/10 dark:bg-white/10" />
                <div className="h-24 w-32 shrink-0 animate-pulse rounded-lg bg-slate-950/10 dark:bg-white/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
        No photos to display in timeline
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <div className="sticky top-0 z-5 -mx-1 overflow-x-auto border-b border-slate-950/7 bg-white/88 px-1 py-2 backdrop-blur-xl dark:border-border dark:bg-popover">
        <div className="flex gap-1">
          {years
            .filter((y) => y > 0)
            .map((year) => (
              <Button
                key={year}
                type="button"
                onClick={() => scrollToYear(year)}
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-full text-xs font-bold"
              >
                {year}
              </Button>
            ))}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-6">
        {groupedByYear.map(([year, yearPhotos]) => (
          <section
            key={year}
            id={`timeline-year-${year}`}
            className="relative scroll-mt-20 pl-10 [content-visibility:auto] [contain-intrinsic-size:auto_190px]"
          >
            <div className="absolute top-0 bottom-0 left-4 w-px bg-sky-600/25" />
            <div className="absolute top-0 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm">
              <CalendarBlankIcon size={15} />
            </div>
            <div className="mb-2 flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-950 dark:text-slate-50">
                {year || 'Unknown'}
              </h3>
              <Badge variant="secondary" className="text-xs font-bold">
                {yearPhotos.length}
              </Badge>
            </div>
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-2">
                {yearPhotos.map((photo) => (
                  <LayerCard
                    key={`${photo.layerId}-${photo.objectId}`}
                    onClick={() => onPhotoClick?.(photo)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onPhotoClick?.(photo);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="w-36 shrink-0 overflow-hidden rounded-lg border border-slate-950/9 bg-white text-left shadow-sm transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:border-border dark:bg-card"
                  >
                    <img
                      src={photoImageUrl(photo, 'card-320')}
                      srcSet={photoCardSources(photo)}
                      sizes="144px"
                      decoding="async"
                      alt={photo.name}
                      loading="lazy"
                      className="h-24 w-full object-cover"
                    />
                    <span className="block truncate px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                      {photo.name}
                    </span>
                  </LayerCard>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

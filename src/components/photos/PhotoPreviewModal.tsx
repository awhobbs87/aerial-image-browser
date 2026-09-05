import { useState, useEffect, useCallback } from 'react';
import {
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconMaximize,
  IconHeart,
  IconHeartFilled,
  IconX,
} from '@tabler/icons-react';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { formatScale } from '@/lib/format';
import type { EnhancedPhoto } from '@/types/photo';
import { Dialog } from '@/components/ui/Dialog';
import { Tooltip } from '@/components/ui/Tooltip';

interface PhotoPreviewModalProps {
  photo: EnhancedPhoto | null;
  photos?: EnhancedPhoto[];
  opened: boolean;
  onClose: () => void;
  initialIndex?: number;
}

function shortProject(layerName: string): string {
  if (!layerName) return '';
  const parts = layerName.split(/\s*[-]\s*/);
  if (parts.length >= 2) return `${parts[0].trim()} - ${parts[1].trim()}`;
  return layerName.trim();
}

function filmLabel(type: string): string | null {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes('colour') || t.includes('color') || t === 'c') return 'Colour';
  if (t.includes('b&w') || t.includes('bw') || t.includes('black') || t === 'b') return 'B&W';
  if (t.includes('ir') || t.includes('infrared')) return 'IR';
  if (type.length <= 12) return type;
  return null;
}

export function PhotoPreviewModal({
  photo,
  photos,
  opened,
  onClose,
  initialIndex = 0,
}: PhotoPreviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [imageLoaded, setImageLoaded] = useState(false);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const isGallery = Boolean(photos && photos.length > 1);
  const photoList = isGallery && photos ? photos : photo ? [photo] : [];
  const current = photoList[currentIndex] || photo;

  const isFavorite = useFavoritesStore((s) =>
    current ? s.isFavorite(current.objectId, current.layerId) : false,
  );

  useEffect(() => {
    if (!opened) return undefined;
    const id = window.requestAnimationFrame(() => {
      setCurrentIndex(initialIndex);
      setImageLoaded(false);
    });
    return () => window.cancelAnimationFrame(id);
  }, [opened, initialIndex]);

  const handlePrev = useCallback(() => {
    if (isGallery && currentIndex > 0) {
      setImageLoaded(false);
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex, isGallery]);

  const handleNext = useCallback(() => {
    if (isGallery && currentIndex < photoList.length - 1) {
      setImageLoaded(false);
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, isGallery, photoList.length]);

  useEffect(() => {
    if (!opened) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [opened, handlePrev, handleNext, onClose]);

  if (!current) return null;

  const thumbnailUrl =
    current.thumbnailUrl || `/api/images/thumbnail/${current.layerId}/${current.name}`;
  const scaleStr = formatScale(current.scale);
  const project = shortProject(current.layerName);
  const typeLabel = filmLabel(current.type);

  const handleViewFull = () => {
    const params = new URLSearchParams();
    if (current.year > 0) params.set('year', String(current.year));
    if (current.scale) params.set('scale', String(current.scale));
    if (current.layerName) params.set('project', current.layerName);
    if (current.type) params.set('type', current.type);
    const qs = params.toString();
    window.location.href = `/viewer/${current.layerId}/${current.name}${qs ? `?${qs}` : ''}`;
  };

  return (
    <Dialog
      open={opened}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      className="grid h-[calc(100dvh-16px)] w-[calc(100vw-16px)] max-w-[68rem] grid-rows-[minmax(0,1fr)_auto] overflow-hidden rounded-2xl p-0 sm:h-auto sm:max-h-[86dvh] sm:w-[min(94vw,68rem)]"
    >
      <div className="relative min-h-0 bg-slate-950">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute top-3 right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <IconX size={20} />
        </button>

        <div className="relative flex h-full min-h-[14rem] items-center justify-center sm:h-[min(68vh,42rem)]">
          {!imageLoaded && (
            <span className="absolute h-8 w-8 animate-spin rounded-full border-3 border-white/20 border-t-white" />
          )}
          <img
            className="max-h-full max-w-full object-contain transition-opacity duration-150"
            src={thumbnailUrl}
            alt={current.name}
            onLoad={() => setImageLoaded(true)}
            style={{ opacity: imageLoaded ? 1 : 0 }}
          />

          {isGallery && (
            <div className="absolute top-3 left-3 rounded-full bg-black/50 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
              {currentIndex + 1} / {photoList.length}
            </div>
          )}

          {isGallery && (
            <>
              <button
                className="absolute top-1/2 left-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-30"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                aria-label="Previous photo"
                type="button"
              >
                <IconChevronLeft size={24} />
              </button>
              <button
                className="absolute top-1/2 right-3 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/70 disabled:opacity-30"
                onClick={handleNext}
                disabled={currentIndex === photoList.length - 1}
                aria-label="Next photo"
                type="button"
              >
                <IconChevronRight size={24} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-col gap-3 border-t border-slate-950/10 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-white/10 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between sm:pb-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <p className="shrink-0 text-lg font-bold text-slate-950 dark:text-slate-50">
              {current.year > 0 ? current.year : 'Undated'}
            </p>
            {typeLabel && (
              <span className="truncate rounded-full bg-sky-600/10 px-2 py-0.5 text-xs font-bold text-sky-700 dark:text-sky-300">
                {typeLabel}
              </span>
            )}
          </div>
          {project && (
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{project}</p>
          )}
          <div className="mt-1 flex min-w-0 gap-2 text-xs text-slate-500 dark:text-slate-400">
            {scaleStr && <span>{scaleStr}</span>}
            <span className="truncate">Ref: {current.name}</span>
          </div>
        </div>
        <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
          <Tooltip label={isFavorite ? 'Remove favorite' : 'Add favorite'}>
            <button
              type="button"
              onClick={() => toggleFavorite(current)}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {isFavorite ? (
                <IconHeartFilled size={18} className="text-rose-500" />
              ) : (
                <IconHeart size={18} />
              )}
            </button>
          </Tooltip>
          {current.tiffUrl && (
            <Tooltip label="Download TIFF">
              <a
                href={current.tiffUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download TIFF"
                className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <IconDownload size={18} />
              </a>
            </Tooltip>
          )}
          <Tooltip label="Full viewer">
            <button
              type="button"
              onClick={handleViewFull}
              aria-label="Open full viewer"
              className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-950/5 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            >
              <IconMaximize size={18} />
            </button>
          </Tooltip>
        </div>
      </div>
    </Dialog>
  );
}

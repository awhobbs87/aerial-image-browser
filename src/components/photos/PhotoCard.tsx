import { memo, useCallback } from 'react';
import { HeartIcon } from '@phosphor-icons/react';
import { Button } from '@cloudflare/kumo/components/button';
import { Badge } from '@cloudflare/kumo/components/badge';
import { LayerCard } from '@cloudflare/kumo/components/layer-card';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useUIStore } from '@/stores/uiStore';
import { formatScale } from '@/lib/format';
import type { EnhancedPhoto } from '@/types/photo';
import { PhotoThumbnail } from './PhotoThumbnail';

interface PhotoCardProps {
  photo: EnhancedPhoto;
  onClick?: (photo: EnhancedPhoto) => void;
  onCompare?: (photo: EnhancedPhoto) => void;
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

export const PhotoCard = memo(function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const isFavorite = useFavoritesStore((s) => s.isFavorite(photo.objectId, photo.layerId));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const setHoveredPhotoId = useUIStore((s) => s.setHoveredPhotoId);

  const scaleDisplay = formatScale(photo.scale);
  const project = shortProject(photo.layerName);
  const typeLabel = filmLabel(photo.type);

  const handleCardClick = useCallback(() => {
    onClick?.(photo);
  }, [onClick, photo]);

  const handleFavoriteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleFavorite(photo);
    },
    [toggleFavorite, photo],
  );

  return (
    <LayerCard
      className="group relative [content-visibility:auto] [contain-intrinsic-size:auto_230px] min-w-0 max-w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-950/8 bg-white p-2 shadow-none ring-0 outline-none transition-colors hover:border-slate-950/20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber-500 dark:border-border dark:bg-card dark:hover:border-white/22"
      onClick={handleCardClick}
      onMouseEnter={() => {
        if (window.matchMedia('(hover: hover)').matches)
          setHoveredPhotoId(photo.objectId, photo.layerId);
      }}
      onMouseLeave={() => setHoveredPhotoId(null)}
      role="article"
      tabIndex={0}
      aria-label={`Photo: ${photo.name}${photo.year > 0 ? `, ${photo.year}` : ''}`}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <div className="relative aspect-4/3 max-w-full overflow-hidden rounded-[8px] bg-slate-950">
        <PhotoThumbnail
          photo={photo}
          className="block h-full w-full object-cover"
          sizes="(min-width: 768px) 220px, calc((100vw - 72px) / 2)"
        />

        <Button
          className={`absolute top-2 right-2 z-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-950/65 text-white/80 transition-colors hover:bg-slate-950/85 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            isFavorite ? 'text-rose-400 opacity-100 hover:text-rose-300' : ''
          }`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          type="button"
          variant="ghost"
          shape="circle"
          size="lg"
        >
          <HeartIcon size={16} weight={isFavorite ? 'fill' : 'regular'} />
        </Button>

        {typeLabel && (
          <Badge
            variant="neutral"
            className="absolute top-2 left-2 z-3 rounded-md bg-slate-950/65 px-1.5 py-0.5 text-[10px] leading-snug font-semibold text-white/90"
          >
            {typeLabel}
          </Badge>
        )}

        <div className="pointer-events-none absolute inset-0 z-2 hidden flex-col justify-end bg-linear-to-t from-black/65 to-transparent p-2.5 opacity-0 transition duration-150 group-hover:opacity-100 md:flex">
          {scaleDisplay && <span className="text-xs font-semibold text-white">{scaleDisplay}</span>}
          <span className="mt-px text-[10px] text-white/65">Ref: {photo.name}</span>
        </div>
      </div>

      <div className="flex flex-col px-1 pt-2 pb-1">
        <span className="text-lg leading-tight font-bold text-slate-900 dark:text-slate-50">
          {photo.year > 0 ? photo.year : 'Undated'}
        </span>
        {project && (
          <span className="truncate text-xs leading-snug font-medium text-slate-500 dark:text-slate-400">
            {project}
          </span>
        )}
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] leading-snug text-slate-400 dark:text-slate-400">
          {scaleDisplay && <span className="shrink-0">{scaleDisplay}</span>}
          {scaleDisplay && <span className="opacity-50">·</span>}
          <span className="truncate">{photo.name}</span>
        </span>
      </div>
    </LayerCard>
  );
});

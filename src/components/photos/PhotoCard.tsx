import { useCallback } from 'react';
import { IconHeart, IconHeartFilled } from '@tabler/icons-react';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useUIStore } from '@/stores/uiStore';
import { formatScale } from '@/lib/format';
import type { EnhancedPhoto } from '@/types/photo';

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

export function PhotoCard({ photo, onClick }: PhotoCardProps) {
  const isFavorite = useFavoritesStore((s) => s.isFavorite(photo.objectId, photo.layerId));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const setHoveredPhotoId = useUIStore((s) => s.setHoveredPhotoId);

  const thumbnailSrc = photo.thumbnailUrl || `/api/images/thumbnail/${photo.layerId}/${photo.name}`;
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
    <div
      className="group relative cursor-pointer overflow-hidden rounded-md outline-none transition duration-150 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
      onClick={handleCardClick}
      onMouseEnter={() => setHoveredPhotoId(photo.objectId)}
      onMouseLeave={() => setHoveredPhotoId(null)}
      role="article"
      tabIndex={0}
      aria-label={`Photo: ${photo.name}${photo.year > 0 ? `, ${photo.year}` : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleCardClick();
      }}
    >
      <div className="relative aspect-4/3 overflow-hidden rounded-md bg-slate-950">
        <img
          className="block h-full w-full object-cover transition duration-200 group-hover:scale-[1.025] group-hover:brightness-105"
          src={thumbnailSrc}
          alt={`Aerial photo ${photo.name}`}
          loading="lazy"
        />

        <button
          className={`absolute top-2 right-2 z-3 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/45 text-white/75 opacity-0 backdrop-blur-sm transition duration-100 hover:bg-slate-950/70 hover:text-white group-hover:opacity-100 group-focus-within:opacity-100 ${
            isFavorite ? 'text-rose-400 opacity-100 hover:text-rose-300' : ''
          }`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          type="button"
        >
          {isFavorite ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
        </button>

        {typeLabel && (
          <span className="absolute top-1.5 left-1.5 z-3 rounded bg-slate-950/45 px-1.5 py-0.5 text-[10px] leading-snug font-semibold tracking-wide text-white/85 backdrop-blur-sm">
            {typeLabel}
          </span>
        )}

        <div className="pointer-events-none absolute inset-0 z-2 flex flex-col justify-end bg-linear-to-t from-black/65 to-transparent p-2.5 opacity-0 transition duration-150 group-hover:opacity-100">
          {scaleDisplay && <span className="text-xs font-semibold text-white">{scaleDisplay}</span>}
          <span className="mt-px text-[10px] text-white/65">Ref: {photo.name}</span>
        </div>
      </div>

      <div className="flex flex-col px-0.5 py-1.5">
        <span className="text-[15px] leading-tight font-bold text-slate-900 dark:text-slate-50">
          {photo.year > 0 ? photo.year : 'Undated'}
        </span>
        {project && (
          <span className="truncate text-[11px] leading-snug font-medium text-slate-500 dark:text-slate-400">
            {project}
          </span>
        )}
        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] leading-none text-slate-400 dark:text-slate-500">
          {scaleDisplay && <span className="shrink-0">{scaleDisplay}</span>}
          {scaleDisplay && <span className="opacity-50">·</span>}
          <span className="truncate">{photo.name}</span>
        </span>
      </div>
    </div>
  );
}

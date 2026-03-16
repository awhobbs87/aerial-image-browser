import { useCallback } from 'react';
import { IconHeart, IconHeartFilled } from '@tabler/icons-react';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { useUIStore } from '@/stores/uiStore';
import { formatScale } from '@/lib/format';
import type { EnhancedPhoto } from '@/types/photo';
import classes from './PhotoCard.module.css';

interface PhotoCardProps {
  photo: EnhancedPhoto;
  onClick?: (photo: EnhancedPhoto) => void;
  onCompare?: (photo: EnhancedPhoto) => void;
}

/** Extract the short project label from layerName, e.g. "HUON - DERWENT" from a long string */
function shortProject(layerName: string): string {
  if (!layerName) return '';
  // Take first segment before any long description
  const parts = layerName.split(/\s*[-]\s*/);
  if (parts.length >= 2) return `${parts[0].trim()} - ${parts[1].trim()}`;
  return layerName.trim();
}

/** Map IMAGE_TYPE values to friendly labels */
function filmLabel(type: string): string | null {
  if (!type) return null;
  const t = type.toLowerCase();
  if (t.includes('colour') || t.includes('color') || t === 'c') return 'Colour';
  if (t.includes('b&w') || t.includes('bw') || t.includes('black') || t === 'b') return 'B&W';
  if (t.includes('ir') || t.includes('infrared')) return 'IR';
  // Return the raw value title-cased if it's short enough to be a pill
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
      className={classes.card}
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
      {/* Image with 4:3 aspect ratio */}
      <div className={classes.imageWrap}>
        <img
          className={classes.image}
          src={thumbnailSrc}
          alt={`Aerial photo ${photo.name}`}
          loading="lazy"
        />

        {/* Favorite heart */}
        <button
          className={`${classes.heart} ${isFavorite ? classes.heartActive : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          type="button"
        >
          {isFavorite ? <IconHeartFilled size={16} /> : <IconHeart size={16} />}
        </button>

        {/* Type badge (Colour / B&W) -- top left corner on image */}
        {typeLabel && <span className={classes.typeBadge}>{typeLabel}</span>}

        {/* Hover overlay */}
        <div className={classes.overlay}>
          {scaleDisplay && <span className={classes.overlayScale}>{scaleDisplay}</span>}
          <span className={classes.overlayRef}>Ref: {photo.name}</span>
        </div>
      </div>

      {/* Info below image */}
      <div className={classes.meta}>
        {/* Main title: year (big, bold) */}
        <span className={classes.year}>{photo.year > 0 ? photo.year : 'Undated'}</span>
        {/* Subtitle: project/layerName */}
        {project && <span className={classes.project}>{project}</span>}
        {/* Technical data + ref */}
        <span className={classes.details}>
          {scaleDisplay && <span className={classes.scale}>{scaleDisplay}</span>}
          <span className={classes.ref}>{photo.name}</span>
        </span>
      </div>
    </div>
  );
}

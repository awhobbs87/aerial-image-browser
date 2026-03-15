import { useCallback } from 'react';
import { ActionIcon, Badge, Card, Text } from '@mantine/core';
import { IconHeart, IconHeartFilled, IconArrowsSplit2 } from '@tabler/icons-react';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { formatScale, getLayerTypeLabel } from '@/lib/format';
import type { EnhancedPhoto } from '@/types/photo';
import classes from './PhotoCard.module.css';

interface PhotoCardProps {
  photo: EnhancedPhoto;
  onClick?: (photo: EnhancedPhoto) => void;
  onCompare?: (photo: EnhancedPhoto) => void;
}

const LAYER_BADGE_COLOR: Record<string, string> = {
  Aerial: 'green',
  Orthophoto: 'blue',
  Digital: 'orange',
};

export function PhotoCard({ photo, onClick, onCompare }: PhotoCardProps) {
  const isFavorite = useFavoritesStore((s) => s.isFavorite(photo.objectId, photo.layerId));
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const thumbnailSrc =
    photo.thumbnailUrl || `/api/images/thumbnail/${photo.layerId}/${photo.name}`;

  const layerLabel = getLayerTypeLabel(photo.layerId);
  const badgeColor = LAYER_BADGE_COLOR[layerLabel] ?? 'gray';
  const scaleDisplay = formatScale(photo.scale);

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

  const handleCompareClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onCompare?.(photo);
    },
    [onCompare, photo],
  );

  return (
    <Card
      className={classes.card}
      shadow="sm"
      radius="md"
      padding={0}
      onClick={handleCardClick}
    >
      <div className={classes.imageContainer}>
        <img
          className={classes.image}
          src={thumbnailSrc}
          alt={`Aerial photo ${photo.name}`}
          loading="lazy"
        />

        <ActionIcon
          className={classes.favoriteButton}
          variant="subtle"
          color={isFavorite ? 'red' : 'gray'}
          size={44}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          onClick={handleFavoriteClick}
        >
          {isFavorite ? <IconHeartFilled size={20} /> : <IconHeart size={20} />}
        </ActionIcon>

        <div className={classes.overlay}>
          <Text className={classes.overlayName} lineClamp={1}>
            {photo.name}
          </Text>
          <div className={classes.overlayMeta}>
            <Badge size="xs" color={badgeColor} variant="filled">
              {layerLabel}
            </Badge>
            {photo.year > 0 && (
              <Text className={classes.overlayText}>{photo.year}</Text>
            )}
            {scaleDisplay && (
              <Text className={classes.overlayText}>{scaleDisplay}</Text>
            )}
            {onCompare && (
              <ActionIcon
                className={classes.compareButton}
                variant="filled"
                color="emerald"
                size={44}
                aria-label="Add to comparison"
                onClick={handleCompareClick}
              >
                <IconArrowsSplit2 size={18} />
              </ActionIcon>
            )}
          </div>
        </div>
      </div>

      <div className={classes.info}>
        <Text className={classes.infoName}>{photo.name}</Text>
        <div className={classes.infoMeta}>
          <Badge size="xs" color={badgeColor} variant="light">
            {layerLabel}
          </Badge>
          {photo.year > 0 && (
            <Text size="xs" c="dimmed">
              {photo.year}
            </Text>
          )}
          {scaleDisplay && (
            <Text size="xs" c="dimmed">
              {scaleDisplay}
            </Text>
          )}
        </div>
      </div>
    </Card>
  );
}

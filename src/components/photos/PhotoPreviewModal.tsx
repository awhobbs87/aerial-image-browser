import { useState, useEffect, useCallback } from 'react';
import { Modal, ActionIcon, Text, Loader, Tooltip, Group } from '@mantine/core';
import {
  IconX,
  IconChevronLeft,
  IconChevronRight,
  IconDownload,
  IconMaximize,
  IconHeart,
  IconHeartFilled,
} from '@tabler/icons-react';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { formatScale } from '@/lib/format';
import type { EnhancedPhoto } from '@/types/photo';
import classes from './PhotoPreviewModal.module.css';

interface PhotoPreviewModalProps {
  photo: EnhancedPhoto | null;
  photos?: EnhancedPhoto[];
  opened: boolean;
  onClose: () => void;
  initialIndex?: number;
}

/** Extract short project label from layerName */
function shortProject(layerName: string): string {
  if (!layerName) return '';
  const parts = layerName.split(/\s*[-]\s*/);
  if (parts.length >= 2) return `${parts[0].trim()} - ${parts[1].trim()}`;
  return layerName.trim();
}

/** Map IMAGE_TYPE to friendly label */
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

  const isGallery = photos && photos.length > 1;
  const photoList = isGallery ? photos : photo ? [photo] : [];
  const current = photoList[currentIndex] || photo;

  const isFavorite = useFavoritesStore((s) =>
    current ? s.isFavorite(current.objectId, current.layerId) : false,
  );

  const thumbnailUrl = current
    ? current.thumbnailUrl || `/api/images/thumbnail/${current.layerId}/${current.name}`
    : '';

  // Reset index when modal opens or initialIndex changes
  useEffect(() => {
    if (opened) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentIndex(initialIndex);
      setImageLoaded(false);
    }
  }, [opened, initialIndex]);

  // Reset image loaded when navigating within gallery
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageLoaded(false);
  }, [currentIndex]);

  const handlePrev = useCallback(() => {
    if (isGallery && currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  }, [currentIndex, isGallery]);

  const handleNext = useCallback(() => {
    if (isGallery && currentIndex < photoList.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, isGallery, photoList.length]);

  // Keyboard navigation
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

  const scaleStr = formatScale(current.scale);
  const project = shortProject(current.layerName);
  const typeLabel = filmLabel(current.type);

  const handleViewFull = () => {
    window.location.href = `/viewer/${current.layerId}/${current.name}`;
  };

  const handleFavorite = () => {
    toggleFavorite(current);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      centered
      withCloseButton={false}
      padding={0}
      radius="lg"
      classNames={{ content: classes.modal, body: classes.body }}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
    >
      {/* Image area */}
      <div className={classes.imageArea}>
        {!imageLoaded && (
          <div className={classes.loader}>
            <Loader size="md" color="gray" />
          </div>
        )}
        <img
          className={classes.image}
          src={thumbnailUrl}
          alt={current.name}
          onLoad={() => setImageLoaded(true)}
          style={{ opacity: imageLoaded ? 1 : 0 }}
        />

        {/* Close button */}
        <ActionIcon
          className={classes.closeBtn}
          variant="subtle"
          color="gray"
          size="sm"
          onClick={onClose}
          aria-label="Close preview"
        >
          <IconX size={18} />
        </ActionIcon>

        {/* Gallery counter */}
        {isGallery && (
          <div className={classes.counter}>
            {currentIndex + 1} / {photoList.length}
          </div>
        )}

        {/* Gallery nav arrows */}
        {isGallery && (
          <>
            <button
              className={`${classes.navBtn} ${classes.navPrev}`}
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous photo"
              type="button"
            >
              <IconChevronLeft size={24} />
            </button>
            <button
              className={`${classes.navBtn} ${classes.navNext}`}
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

      {/* Metadata bar -- year as title, project as subtitle, type badge, scale + ref */}
      <div className={classes.info}>
        <div className={classes.infoLeft}>
          <div className={classes.titleRow}>
            <Text size="lg" fw={700} className={classes.yearTitle}>
              {current.year > 0 ? current.year : 'Undated'}
            </Text>
            {typeLabel && <span className={classes.typePill}>{typeLabel}</span>}
          </div>
          {project && (
            <Text size="xs" c="dimmed" className={classes.projectText}>
              {project}
            </Text>
          )}
          <div className={classes.detailRow}>
            {scaleStr && (
              <Text size="xs" c="dimmed">
                {scaleStr}
              </Text>
            )}
            <Text size="xs" c="dimmed" className={classes.refText}>
              Ref: {current.name}
            </Text>
          </div>
        </div>
        <Group gap={4} className={classes.actions}>
          <Tooltip label={isFavorite ? 'Remove favorite' : 'Add favorite'} withArrow>
            <ActionIcon
              variant="subtle"
              color={isFavorite ? 'red' : 'gray'}
              size="md"
              onClick={handleFavorite}
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? <IconHeartFilled size={18} /> : <IconHeart size={18} />}
            </ActionIcon>
          </Tooltip>
          {current.tiffUrl && (
            <Tooltip label="Download TIFF" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="md"
                component="a"
                href={current.tiffUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Download TIFF"
              >
                <IconDownload size={18} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Full viewer" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              onClick={handleViewFull}
              aria-label="Open full viewer"
            >
              <IconMaximize size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>
    </Modal>
  );
}

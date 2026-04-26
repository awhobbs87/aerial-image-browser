import { useState, useRef, useCallback } from 'react';
import { Text, Paper } from '@mantine/core';
import type { EnhancedPhoto } from '@/types/photo';
import classes from './CompareSlider.module.css';

interface CompareSliderProps {
  photoA: EnhancedPhoto;
  photoB: EnhancedPhoto;
}

export function CompareSlider({ photoA, photoB }: CompareSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handleMove(e.clientX);
    },
    [handleMove],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      handleMove(e.clientX);
    },
    [handleMove],
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const imgA = `/api/images/thumbnail/${photoA.layerId}/${photoA.name}`;
  const imgB = `/api/images/thumbnail/${photoB.layerId}/${photoB.name}`;

  return (
    <div
      ref={containerRef}
      className={classes.container}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: 'none' }}
    >
      {/* Bottom layer (photo B - right side) */}
      <img src={imgB} alt={photoB.name} className={classes.image} draggable={false} />

      {/* Top layer (photo A - left side, clipped) */}
      <img
        src={imgA}
        alt={photoA.name}
        className={classes.image}
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />

      {/* Divider line */}
      <div className={classes.divider} style={{ left: `${position}%` }}>
        <div className={classes.handle} />
      </div>

      {/* Labels */}
      <Paper className={classes.labelLeft} px="xs" py={2} radius="sm">
        <Text size="xs" fw={600}>
          {photoA.name} ({photoA.year})
        </Text>
      </Paper>
      <Paper className={classes.labelRight} px="xs" py={2} radius="sm">
        <Text size="xs" fw={600}>
          {photoB.name} ({photoB.year})
        </Text>
      </Paper>
    </div>
  );
}

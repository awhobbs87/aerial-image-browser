import { useState, useRef, useCallback } from 'react';
import type { EnhancedPhoto } from '@/types/photo';

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
    setPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handleMove(e.clientX);
    },
    [handleMove],
  );

  const imgA = `/api/images/thumbnail/${photoA.layerId}/${photoA.name}`;
  const imgB = `/api/images/thumbnail/${photoB.layerId}/${photoB.name}`;

  return (
    <div
      ref={containerRef}
      className="relative aspect-4/3 w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-xl bg-slate-950"
      onPointerDown={handlePointerDown}
      onPointerMove={(e) => {
        if (isDragging.current) handleMove(e.clientX);
      }}
      onPointerUp={() => {
        isDragging.current = false;
      }}
    >
      <img
        src={imgB}
        alt={photoB.name}
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
      />
      <img
        src={imgA}
        alt={photoA.name}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />
      <div
        className="absolute top-0 bottom-0 z-10 w-0.75 -translate-x-1/2 bg-white shadow-md"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-sky-600 bg-white shadow-lg" />
      </div>
      <div className="absolute bottom-3 left-3 z-5 rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
        {photoA.name} ({photoA.year})
      </div>
      <div className="absolute right-3 bottom-3 z-5 rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
        {photoB.name} ({photoB.year})
      </div>
    </div>
  );
}

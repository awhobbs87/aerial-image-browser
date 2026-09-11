import { Comparison, ComparisonHandle, ComparisonItem } from '@/components/kibo-ui/comparison';
import type { EnhancedPhoto } from '@/types/photo';

interface CompareSliderProps {
  photoA: EnhancedPhoto;
  photoB: EnhancedPhoto;
}

export function CompareSlider({ photoA, photoB }: CompareSliderProps) {
  const imgA = `/api/images/thumbnail/${photoA.layerId}/${photoA.name}`;
  const imgB = `/api/images/thumbnail/${photoB.layerId}/${photoB.name}`;

  return (
    <Comparison className="aspect-4/3 touch-none rounded-lg bg-slate-950 shadow-[0_18px_42px_rgba(15,23,42,0.18)] ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
      <ComparisonItem position="left">
        <img
          src={imgB}
          alt={photoB.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </ComparisonItem>
      <ComparisonItem position="right">
        <img
          src={imgA}
          alt={photoA.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </ComparisonItem>
      <ComparisonHandle />
      <div className="absolute bottom-3 left-3 z-5 max-w-[42%] truncate rounded bg-black/62 px-2 py-1 text-xs font-bold text-white backdrop-blur-md">
        {photoA.name} ({photoA.year})
      </div>
      <div className="absolute right-3 bottom-3 z-5 max-w-[42%] truncate rounded bg-black/62 px-2 py-1 text-xs font-bold text-white backdrop-blur-md">
        {photoB.name} ({photoB.year})
      </div>
    </Comparison>
  );
}

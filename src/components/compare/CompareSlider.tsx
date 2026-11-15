import { photoImageUrl } from '@/lib/photo-images';
import { ComparisonImage } from './ComparisonImage';
import { Comparison, ComparisonHandle, ComparisonItem } from './ImageComparison';
import type { EnhancedPhoto } from '@/types/photo';

interface CompareSliderProps {
  photoA: EnhancedPhoto;
  photoB: EnhancedPhoto;
}

export function CompareSlider({ photoA, photoB }: CompareSliderProps) {
  const imgA = photoImageUrl(photoA, 'preview-1600');
  const imgB = photoImageUrl(photoB, 'preview-1600');

  return (
    <Comparison className="aspect-4/3 touch-none rounded-lg bg-slate-950 shadow-[0_18px_42px_rgba(15,23,42,0.18)] ring-1 ring-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">
      <ComparisonItem position="left">
        <ComparisonImage src={imgB} alt={photoB.name} className="h-full w-full object-contain" />
      </ComparisonItem>
      <ComparisonItem position="right">
        <ComparisonImage src={imgA} alt={photoA.name} className="h-full w-full object-contain" />
      </ComparisonItem>
      <ComparisonHandle />
      <div className="absolute bottom-3 left-3 z-5 max-w-[42%] truncate rounded bg-black/62 px-2 py-1 text-xs font-bold text-white backdrop-blur-md">
        {photoA.name} ({photoA.year || 'Unknown year'})
      </div>
      <div className="absolute right-3 bottom-3 z-5 max-w-[42%] truncate rounded bg-black/62 px-2 py-1 text-xs font-bold text-white backdrop-blur-md">
        {photoB.name} ({photoB.year || 'Unknown year'})
      </div>
    </Comparison>
  );
}

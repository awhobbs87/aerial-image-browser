import type { EnhancedPhoto } from '@/types/photo';
import { LayerCard } from '@cloudflare/kumo/components/layer-card';

interface CompareSideBySideProps {
  photoA: EnhancedPhoto;
  photoB: EnhancedPhoto;
}

function Pane({ photo }: { photo: EnhancedPhoto }) {
  return (
    <LayerCard className="relative min-h-72 flex-1 overflow-hidden rounded-lg border border-slate-950/8 bg-slate-950/5 p-0 shadow-sm dark:border-border dark:bg-card">
      <img
        src={`/api/images/thumbnail/${photo.layerId}/${photo.name}`}
        alt={photo.name}
        className="h-full w-full object-contain"
        loading="lazy"
      />
      <div className="absolute right-3 bottom-3 left-3 rounded border border-white/10 bg-white/88 px-3 py-2 text-slate-950 shadow-sm backdrop-blur-xl dark:bg-popover dark:text-slate-50">
        <p className="text-sm font-bold">{photo.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {photo.year} | Scale 1:{photo.scale?.toLocaleString()}
        </p>
      </div>
    </LayerCard>
  );
}

export function CompareSideBySide({ photoA, photoB }: CompareSideBySideProps) {
  return (
    <div className="flex min-h-72 flex-col gap-3 md:h-[60vh] md:flex-row">
      <Pane photo={photoA} />
      <Pane photo={photoB} />
    </div>
  );
}

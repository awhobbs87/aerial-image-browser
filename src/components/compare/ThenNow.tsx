import { useState } from 'react';
import { Tabs } from '@cloudflare/kumo/components/tabs';
import type { EnhancedPhoto } from '@/types/photo';

interface ThenNowProps {
  photo: EnhancedPhoto;
}

export function ThenNow({ photo }: ThenNowProps) {
  const [view, setView] = useState<'then' | 'now'>('then');

  const historicalUrl = `/api/images/thumbnail/${photo.layerId}/${photo.name}`;
  const satelliteUrl =
    photo.rings && photo.rings[0]
      ? `https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${getBbox(photo.rings)}&size=800,600&format=jpg&f=image`
      : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-center">
        <Tabs
          value={view}
          onValueChange={(value) => setView(value as 'then' | 'now')}
          tabs={[
            { value: 'then', label: `Then (${photo.year || 'Historical'})` },
            { value: 'now', label: 'Now (Satellite)' },
          ]}
        />
      </div>

      <div className="aspect-4/3 overflow-hidden rounded-lg border border-slate-950/8 bg-slate-950/5 shadow-sm dark:border-border dark:bg-card">
        {view === 'then' ? (
          <img
            src={historicalUrl}
            alt={`${photo.name} - Historical`}
            className="h-full w-full object-contain"
          />
        ) : satelliteUrl ? (
          <img
            src={satelliteUrl}
            alt={`${photo.name} - Current satellite`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
            Satellite imagery unavailable for this location
          </div>
        )}
      </div>

      <p className="text-center text-sm text-slate-500 dark:text-slate-400">
        {view === 'then'
          ? `Historical aerial photo from ${photo.year || 'unknown year'}`
          : 'Current Esri World Imagery satellite view'}
      </p>
    </div>
  );
}

function getBbox(rings: number[][][]): string {
  if (!rings[0] || rings[0].length === 0) return '0,0,0,0';
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of rings[0]) {
    if (point[0] < minX) minX = point[0];
    if (point[1] < minY) minY = point[1];
    if (point[0] > maxX) maxX = point[0];
    if (point[1] > maxY) maxY = point[1];
  }
  return `${minX},${minY},${maxX},${maxY}`;
}

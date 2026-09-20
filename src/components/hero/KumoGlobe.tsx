import { GlobeMap } from '@cloudflare/kumo/components/chart';
import { useEffect, useState } from 'react';
import { isResolvedDark, subscribeToResolvedTheme } from '@/lib/theme';

export function KumoGlobe() {
  const [isDarkMode, setIsDarkMode] = useState(isResolvedDark);

  useEffect(() => subscribeToResolvedTheme((theme) => setIsDarkMode(theme === 'dark')), []);

  return (
    <div className="absolute inset-0" aria-hidden="true" data-kumo-globe>
      <GlobeMap
        aria-label="Decorative globe centered on Tasmania"
        autoRotate
        autoRotateSpeed={0.35}
        className="h-full w-full [&_.stroke-kumo-line]:stroke-[rgba(234,88,12,0.2)] [&_[data-land-style=hatched]]:[stroke-dasharray:0.01_2.35] [&_[data-land-style=hatched]]:[stroke-width:1.05] [&_svg]:size-full [&_svg]:scale-[1.16] [&_svg]:drop-shadow-[0_0_14px_rgba(249,115,22,0.24)] dark:[&_.stroke-kumo-line]:stroke-[rgba(255,154,69,0.3)]"
        defaultRotation={[-147.15, 42.05, -5]}
        draggable={false}
        isDarkMode={isDarkMode}
        landColor={isDarkMode ? '#ff8a1f' : '#f97316'}
        landHatchSpacing={3}
        oceanColor="transparent"
        showGraticule
        showTooltip={false}
      />
    </div>
  );
}

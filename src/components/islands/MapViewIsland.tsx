import { AppProviders } from '../common/AppProviders';
import { MapView } from '../map/MapView';

interface Props {
  className?: string;
}

/**
 * Self-contained island for the map view.
 * Must be used with client:only="react" -- no Astro slot children,
 * so Astro has nothing to SSR.
 */
export function MapViewIsland({ className }: Props) {
  return (
    <AppProviders>
      <MapView className={className} />
    </AppProviders>
  );
}

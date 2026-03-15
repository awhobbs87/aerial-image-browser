import { MantineWrapper } from '../common/MantineWrapper';
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
    <MantineWrapper>
      <MapView className={className} />
    </MantineWrapper>
  );
}

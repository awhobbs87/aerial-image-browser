import { MantineWrapper } from '../common/MantineWrapper';
import { Navigation } from '../layout/Navigation';

/**
 * Self-contained island for desktop sidebar navigation.
 * Must be used with client:only="react" -- no Astro slot children,
 * so Astro has nothing to SSR.
 */
export function NavigationIsland() {
  return (
    <MantineWrapper>
      <Navigation />
    </MantineWrapper>
  );
}

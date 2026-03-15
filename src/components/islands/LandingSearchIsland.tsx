import { MantineWrapper } from '../common/MantineWrapper';
import { LandingSearchBar } from '../search/LandingSearchBar';

/**
 * Self-contained island for the landing page search bar.
 * Must be used with client:only="react" -- no Astro slot children,
 * so Astro has nothing to SSR.
 */
export function LandingSearchIsland() {
  return (
    <MantineWrapper>
      <LandingSearchBar />
    </MantineWrapper>
  );
}

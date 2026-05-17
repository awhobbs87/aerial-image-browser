import { AppProviders } from '../common/AppProviders';
import { LandingSearchBar } from '../search/LandingSearchBar';

/**
 * Self-contained island for the landing page search bar.
 * Must be used with client:only="react" -- no Astro slot children,
 * so Astro has nothing to SSR.
 */
export function LandingSearchIsland() {
  return (
    <AppProviders>
      <LandingSearchBar />
    </AppProviders>
  );
}

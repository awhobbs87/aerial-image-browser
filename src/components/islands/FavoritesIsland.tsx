import { AppProviders } from '../common/AppProviders';
import { FavoritesContent } from '../favorites/FavoritesContent';

/**
 * Self-contained island for the favorites page content.
 * Must be used with client:only="react" -- no Astro slot children,
 * so Astro has nothing to SSR.
 */
export function FavoritesIsland() {
  return (
    <AppProviders>
      <FavoritesContent />
    </AppProviders>
  );
}

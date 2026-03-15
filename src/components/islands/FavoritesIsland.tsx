import { MantineWrapper } from '../common/MantineWrapper';
import { FavoritesContent } from '../favorites/FavoritesContent';

/**
 * Self-contained island for the favorites page content.
 * Must be used with client:only="react" -- no Astro slot children,
 * so Astro has nothing to SSR.
 */
export function FavoritesIsland() {
  return (
    <MantineWrapper>
      <FavoritesContent />
    </MantineWrapper>
  );
}

import { AppProviders } from '../common/AppProviders';
import { SearchBar } from '../search/SearchBar';

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Self-contained island for the search bar on the search page.
 * Must be used with client:only="react" -- no Astro slot children,
 * so Astro has nothing to SSR.
 */
export function SearchBarIsland({ size = 'md' }: Props) {
  return (
    <AppProviders>
      <SearchBar size={size} />
    </AppProviders>
  );
}

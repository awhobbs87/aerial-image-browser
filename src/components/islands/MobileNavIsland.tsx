import { MobileNav } from '../layout/MobileNav';

/**
 * Self-contained island for mobile bottom tab navigation.
 * Must be used with client:only="react" -- no Astro slot children,
 * so Astro has nothing to SSR.
 */
export function MobileNavIsland() {
  return <MobileNav />;
}

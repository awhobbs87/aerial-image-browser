import { Navigation } from '../layout/Navigation';

export function NavigationIsland({ initialPath }: { initialPath?: string }) {
  return <Navigation initialPath={initialPath} />;
}

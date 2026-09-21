export interface SearchView {
  scrollTop: number;
  displayCount: number;
  groupBy: 'decade' | 'year' | 'none';
}
const initial: SearchView = { scrollTop: 0, displayCount: 24, groupBy: 'decade' };
const views = new Map<string, SearchView>();

export function readSearchView(key?: string): SearchView {
  return key && typeof window !== 'undefined' ? views.get(key) || initial : initial;
}
export function saveSearchView(key: string, patch: Partial<SearchView>) {
  if (typeof window === 'undefined') return;
  const view = { ...readSearchView(key), ...patch };
  views.delete(key);
  views.set(key, view);
  if (views.size > 20) views.delete(views.keys().next().value!);
}

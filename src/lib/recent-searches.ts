import { isTasmaniaLocation } from './tasmania-geocoder';
export interface RecentSearch {
  label: string;
  lat: number;
  lon: number;
}
const KEY = 'tas-aerial-recent-searches';
export function getRecentSearches(): RecentSearch[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(data)
      ? data
          .filter(
            (r): r is RecentSearch =>
              typeof r?.label === 'string' &&
              r.label.length <= 300 &&
              isTasmaniaLocation(r.lat, r.lon),
          )
          .slice(0, 8)
      : [];
  } catch {
    return [];
  }
}
export function addRecentSearch(item: RecentSearch) {
  if (!isTasmaniaLocation(item.lat, item.lon)) return;
  try {
    const items = getRecentSearches().filter(
      (r) => Math.abs(r.lat - item.lat) > 0.00001 || Math.abs(r.lon - item.lon) > 0.00001,
    );
    localStorage.setItem(KEY, JSON.stringify([item, ...items].slice(0, 8)));
  } catch {
    /* Search remains usable when storage is unavailable. */
  }
}
export function clearRecentSearches() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* Storage unavailable. */
  }
}

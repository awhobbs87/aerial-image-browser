/**
 * Format coordinates for display with hemisphere indicators
 * @param lat Latitude value
 * @param lon Longitude value
 * @returns Formatted string like "42.8821° S, 147.3272° E"
 */
export function formatCoordinates(lat: number, lon: number): string {
  const latStr = `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(4)}° ${lon >= 0 ? 'E' : 'W'}`;
  return `${latStr}, ${lonStr}`;
}

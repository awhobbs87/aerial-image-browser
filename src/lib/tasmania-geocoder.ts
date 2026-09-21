import { TASMANIA_BOUNDS } from '@/types/map';
import type { GeocodingResult } from './geocoding';

const BASE =
  'https://services.thelist.tas.gov.au/arcgis/rest/services/Public/SearchService/MapServer';
const STREET_TYPES: Record<string, string> = {
  CT: 'COURT',
  RD: 'ROAD',
  ST: 'STREET',
  AVE: 'AVENUE',
  AV: 'AVENUE',
  DR: 'DRIVE',
  PL: 'PLACE',
  CRES: 'CRESCENT',
  HWY: 'HIGHWAY',
  PDE: 'PARADE',
  LN: 'LANE',
  TCE: 'TERRACE',
  CL: 'CLOSE',
};
export function isTasmaniaLocation(lat: number, lon: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= TASMANIA_BOUNDS.south &&
    lat <= TASMANIA_BOUNDS.north &&
    lon >= TASMANIA_BOUNDS.west &&
    lon <= TASMANIA_BOUNDS.east
  );
}
export function searchTokens(query: string) {
  return query
    .toUpperCase()
    .replace(/[^\p{L}\p{N}' -]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !['TAS', 'TASMANIA', 'AUSTRALIA'].includes(t))
    .map((t, i) => (i === 0 && t === 'ST' ? t : STREET_TYPES[t] || t))
    .slice(0, 12);
}
export function addressWhere(tokens: string[]) {
  return [
    "STATE = 'TAS'",
    ...tokens.map((token, i) =>
      /^\d+$/.test(token) && i === 0
        ? `STREET_NUMBER_FROM = ${Number(token)}`
        : `UPPER(ADDRESS) LIKE '%${token.replaceAll("'", "''")}%'`,
    ),
  ].join(' AND ');
}
interface Feature {
  attributes: Record<string, string | number>;
  geometry?: { x?: number; y?: number; rings?: number[][][] };
}
async function queryLayer(
  layer: number,
  where: string,
  signal?: AbortSignal,
): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    f: 'json',
    where,
    outFields: layer === 7 ? 'OBJECTID,ADDRESS,STATE,LOCALITY' : 'OBJECTID,NAME,TYPE,LOCATION',
    outSR: '4326',
    returnGeometry: 'true',
    ...(layer === 0 ? { maxAllowableOffset: '0.0001' } : {}),
    resultRecordCount: '20',
    orderByFields: layer === 7 ? 'STREET_NUMBER_FROM ASC,OBJECTID ASC' : 'NAME ASC',
  });
  const response = await fetch(`${BASE}/${layer}/query?${params}`, { signal });
  if (!response.ok)
    throw new Error('Tasmania location search is temporarily unavailable. Please try again.');
  const data = (await response.json()) as { features?: Feature[]; error?: unknown };
  if (data.error)
    throw new Error('Tasmania location search is temporarily unavailable. Please try again.');
  return (data.features || []).flatMap(({ attributes: a, geometry: g }) => {
    const points =
      g?.rings?.flat() || (g?.x !== undefined && g.y !== undefined ? [[g.x, g.y]] : []);
    if (!points.length || (layer === 7 && a.STATE !== 'TAS')) return [];
    const xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]);
    const bounds: [number, number, number, number] = [
      Math.min(...ys),
      Math.max(...ys),
      Math.min(...xs),
      Math.max(...xs),
    ];
    const lat = (bounds[0] + bounds[1]) / 2,
      lon = (bounds[2] + bounds[3]) / 2;
    if (!isTasmaniaLocation(lat, lon)) return [];
    return [
      {
        placeId: `list-${layer}-${a.OBJECTID}`,
        displayName:
          layer === 7
            ? `${a.ADDRESS}, Tasmania`
            : `${a.NAME}, ${a.LOCATION || 'Tasmania'}${a.LOCATION ? ', Tasmania' : ''}`,
        lat,
        lon,
        type: layer === 7 ? 'address' : String(a.TYPE),
        importance: a.TYPE === 'SUBURB/LOCALITY' ? 1 : 0,
        boundingBox: bounds,
      },
    ];
  });
}
export async function searchTasmania(query: string, limit = 7, signal?: AbortSignal) {
  const tokens = searchTokens(query);
  if (!tokens.length) return [];
  const escapedName = tokens.join(' ').replaceAll("'", "''");
  const namedWhere = tokens
    .map(
      (t) =>
        `(UPPER(NAME) LIKE '%${t.replaceAll("'", "''")}%' OR UPPER(LOCATION) LIKE '%${t.replaceAll("'", "''")}%')`,
    )
    .join(' AND ');
  const [addresses, exactPlaces, partialPlaces] = await Promise.all([
    queryLayer(7, addressWhere(tokens), signal),
    /^\d/.test(tokens[0])
      ? Promise.resolve([])
      : queryLayer(0, `UPPER(NAME) = '${escapedName}'`, signal),
    /^\d/.test(tokens[0]) ? Promise.resolve([]) : queryLayer(0, namedWhere, signal),
  ]);
  const places = Array.from(
    new Map([...exactPlaces, ...partialPlaces].map((place) => [place.placeId, place])).values(),
  );
  places.sort((a, b) => b.importance - a.importance || a.displayName.length - b.displayName.length);
  return [...places, ...addresses].slice(0, limit);
}

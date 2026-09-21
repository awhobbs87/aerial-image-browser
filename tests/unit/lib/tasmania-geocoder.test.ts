import {
  addressWhere,
  searchTokens,
  searchTasmania,
  isTasmaniaLocation,
} from '@/lib/tasmania-geocoder';
import { addRecentSearch, getRecentSearches, clearRecentSearches } from '@/lib/recent-searches';
afterEach(() => {
  vi.unstubAllGlobals();
  localStorage.clear();
});
it('normalizes court abbreviations and matches the exact house number', () => {
  expect(addressWhere(searchTokens('9 Jeannette Ct Lenah Valley, TAS'))).toBe(
    "STATE = 'TAS' AND STREET_NUMBER_FROM = 9 AND UPPER(ADDRESS) LIKE '%JEANNETTE%' AND UPPER(ADDRESS) LIKE '%COURT%' AND UPPER(ADDRESS) LIKE '%LENAH%' AND UPPER(ADDRESS) LIKE '%VALLEY%'",
  );
  expect(addressWhere(searchTokens("O'Brien Rd"))).toContain("O''BRIEN");
});
it('rejects mainland coordinates and invalid coordinates', () => {
  expect(isTasmaniaLocation(-37.8, 144.9)).toBe(false);
  expect(isTasmaniaLocation(NaN, 147)).toBe(false);
  expect(isTasmaniaLocation(-42.87, 147.28)).toBe(true);
});
it('uses LIST house points and rejects non-Tasmanian upstream records', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        features: [
          {
            attributes: { OBJECTID: 1, ADDRESS: '9 JEANNETTE COURT LENAH VALLEY', STATE: 'TAS' },
            geometry: { x: 147.28, y: -42.87 },
          },
          {
            attributes: { OBJECTID: 2, ADDRESS: '9 JEANNETTE COURT', STATE: 'VIC' },
            geometry: { x: 144.9, y: -37.8 },
          },
        ],
      }),
    ),
  );
  const results = await searchTasmania('9 Jeannette Ct Lenah Valley');
  expect(results).toHaveLength(1);
  expect(results[0].displayName).toContain('9 JEANNETTE COURT LENAH VALLEY');
});
it('prioritizes an exact named locality over generic partial matches', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith('/7/query')) return Response.json({ features: [] });
      const exact = url.searchParams.get('where')?.includes("UPPER(NAME) = 'HOBART'");
      return Response.json({
        features: exact
          ? [
              {
                attributes: {
                  OBJECTID: 1,
                  NAME: 'HOBART',
                  TYPE: 'SUBURB/LOCALITY',
                  LOCATION: 'HOBART',
                },
                geometry: {
                  rings: [
                    [
                      [147.3, -42.9],
                      [147.4, -42.8],
                    ],
                  ],
                },
              },
            ]
          : [
              {
                attributes: {
                  OBJECTID: 2,
                  NAME: '1043',
                  TYPE: 'CROWN LEASES',
                  LOCATION: 'HOBART',
                },
                geometry: {
                  rings: [
                    [
                      [147.31, -42.9],
                      [147.32, -42.89],
                    ],
                  ],
                },
              },
            ],
      });
    }),
  );
  const results = await searchTasmania('Hobart');
  expect(results[0]).toMatchObject({ displayName: 'HOBART, HOBART, Tasmania', importance: 1 });
});
it('surfaces upstream failures rather than a misleading empty result', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(Response.json({ error: { message: 'Unavailable' } })),
  );
  await expect(searchTasmania('9 Jeannette Ct')).rejects.toThrow('temporarily unavailable');
});
it('shares bounded, deduplicated recent searches and tolerates malformed storage', () => {
  localStorage.setItem('tas-aerial-recent-searches', '{broken');
  expect(getRecentSearches()).toEqual([]);
  for (let i = 0; i < 10; i++)
    addRecentSearch({ label: String(i), lat: -42, lon: 146 + i * 0.001 });
  expect(getRecentSearches()).toHaveLength(8);
  addRecentSearch({ label: 'updated', lat: -42, lon: 146.009 });
  expect(getRecentSearches()).toHaveLength(8);
  expect(getRecentSearches()[0].label).toBe('updated');
  addRecentSearch({ label: 'Melbourne', lat: -37.8, lon: 144.9 });
  expect(getRecentSearches()[0].label).toBe('updated');
  clearRecentSearches();
  expect(getRecentSearches()).toEqual([]);
});

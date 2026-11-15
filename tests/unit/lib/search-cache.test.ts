import { ArcGISClient } from '@/lib/arcgis';
it('loads every ArcGIS page and caches only the complete result', async () => {
  const fetcher = vi
    .fn<(...args: any[]) => Promise<any>>()
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{ attributes: { OBJECTID: 1 } }],
        exceededTransferLimit: true,
      }),
    })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        features: [{ attributes: { OBJECTID: 2 } }],
        exceededTransferLimit: false,
      }),
    });
  vi.stubGlobal('fetch', fetcher);
  const kv = {
    get: vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(null),
    put: vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(undefined),
  };
  const client = new ArcGISClient('https://example.com/MapServer', { kv: kv as any });
  const result = await client.queryByPoint(0, 147, -42);
  expect(result).toHaveLength(2);
  expect(new URL(fetcher.mock.calls[1][0]).searchParams.get('resultOffset')).toBe('1');
  expect(kv.put).toHaveBeenCalledOnce();
  expect(kv.put.mock.calls[0][0].length).toBeLessThan(512);
  kv.get.mockResolvedValue(result);
  expect(await client.queryByPoint(0, 147, -42)).toEqual(result);
  expect(fetcher).toHaveBeenCalledTimes(2);
  vi.unstubAllGlobals();
});
it('does not cache a partial result when ArcGIS returns an error in a 200 response', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn<(...args: any[]) => Promise<any>>()
      .mockResolvedValue({ ok: true, json: async () => ({ error: { message: 'Query failed' } }) }),
  );
  const kv = {
    get: vi.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(null),
    put: vi.fn<(...args: any[]) => Promise<any>>(),
  };
  await expect(
    new ArcGISClient('https://example.com', { kv: kv as any }).queryByPoint(0, 147, -42),
  ).rejects.toThrow('Query failed');
  expect(kv.put).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});

it('retrieves all area matches by ID without spatial offset pagination', async () => {
  const matchingIds = Array.from({ length: 1001 }, (_, i) => i + 1);
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const params = new URL(String(input)).searchParams;
    if (params.get('returnIdsOnly') === 'true') {
      expect(params.has('resultRecordCount')).toBe(false);
      return new Response(JSON.stringify({ objectIds: [...matchingIds, 1] }));
    }
    expect(params.has('geometry')).toBe(false);
    expect(params.has('resultOffset')).toBe(false);
    const ids = params.get('objectIds')!.split(',').map(Number);
    expect(ids.length).toBeLessThanOrEqual(500);
    return new Response(
      JSON.stringify({ features: ids.map((OBJECTID) => ({ attributes: { OBJECTID } })) }),
    );
  });
  vi.stubGlobal('fetch', fetcher);
  try {
    const photos = await new ArcGISClient('https://example.com/MapServer').queryByBounds(
      0,
      147.28,
      -42.9,
      147.34,
      -42.85,
    );
    expect(photos.map((photo) => photo.attributes.OBJECTID)).toEqual(matchingIds);
    expect(fetcher).toHaveBeenCalledTimes(4);
  } finally {
    vi.unstubAllGlobals();
  }
});
it('rejects incomplete ID batches rather than presenting them as complete', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(JSON.stringify({ objectIds: [1, 2] })))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ features: [{ attributes: { OBJECTID: 1 } }] })),
    );
  vi.stubGlobal('fetch', fetcher);
  try {
    await expect(
      new ArcGISClient('https://example.com/MapServer').queryByBounds(
        0,
        147.28,
        -42.9,
        147.34,
        -42.85,
      ),
    ).rejects.toThrow('incomplete ID batch');
  } finally {
    vi.unstubAllGlobals();
  }
});

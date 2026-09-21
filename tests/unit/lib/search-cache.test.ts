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

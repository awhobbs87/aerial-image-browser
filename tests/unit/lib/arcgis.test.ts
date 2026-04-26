import { ArcGISClient } from '@/lib/arcgis';

const BASE_URL = 'https://services.arcgis.test/MapServer';

describe('ArcGISClient', () => {
  let client: ArcGISClient;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new ArcGISClient(BASE_URL);
    fetchSpy = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('queryByPoint', () => {
    it('constructs correct URL and returns features', async () => {
      const mockFeatures = [
        { attributes: { OBJECTID: 1, IMAGE_NAME: 'photo_001' }, geometry: { rings: [] } },
        { attributes: { OBJECTID: 2, IMAGE_NAME: 'photo_002' }, geometry: { rings: [] } },
      ];

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ features: mockFeatures }),
      });

      const result = await client.queryByPoint(0, 147.327, -42.882);

      expect(fetchSpy).toHaveBeenCalledOnce();

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(`${BASE_URL}/0/query`);
      expect(calledUrl).toContain('geometry=147.327%2C-42.882');
      expect(calledUrl).toContain('geometryType=esriGeometryPoint');
      expect(calledUrl).toContain('inSR=4326');
      expect(calledUrl).toContain('spatialRel=esriSpatialRelIntersects');
      expect(calledUrl).toContain('outFields=*');
      expect(calledUrl).toContain('returnGeometry=true');
      expect(calledUrl).toContain('outSR=4326');
      expect(calledUrl).toContain('f=json');

      expect(result).toHaveLength(2);
      expect(result[0].attributes.OBJECTID).toBe(1);
    });

    it('returns empty array when response has no features', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await client.queryByPoint(1, 147.0, -42.0);
      expect(result).toEqual([]);
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(client.queryByPoint(0, 147.0, -42.0))
        .rejects
        .toThrow('ArcGIS API error: 500');
    });
  });

  describe('queryByBounds', () => {
    it('constructs correct URL with envelope geometry', async () => {
      const mockFeatures = [
        { attributes: { OBJECTID: 5 }, geometry: { rings: [] } },
      ];

      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({ features: mockFeatures }),
      });

      const result = await client.queryByBounds(2, 146.0, -43.0, 148.0, -41.0);

      expect(fetchSpy).toHaveBeenCalledOnce();

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain(`${BASE_URL}/2/query`);
      expect(calledUrl).toContain('geometryType=esriGeometryEnvelope');

      // Decode the geometry param from the URL
      const url = new URL(calledUrl);
      const geometryParam = url.searchParams.get('geometry');
      expect(geometryParam).toBeTruthy();
      const geometry = JSON.parse(geometryParam!);
      expect(geometry.xmin).toBe(146.0);
      expect(geometry.ymin).toBe(-43.0);
      expect(geometry.xmax).toBe(148.0);
      expect(geometry.ymax).toBe(-41.0);
      expect(geometry.spatialReference.wkid).toBe(4326);

      expect(result).toHaveLength(1);
    });

    it('returns empty array when response has no features', async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const result = await client.queryByBounds(0, 146.0, -43.0, 148.0, -41.0);
      expect(result).toEqual([]);
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 403,
      });

      await expect(client.queryByBounds(0, 146.0, -43.0, 148.0, -41.0))
        .rejects
        .toThrow('ArcGIS API error: 403');
    });
  });

  describe('getLayers', () => {
    it('fetches layers endpoint and returns JSON', async () => {
      const mockLayers = { layers: [{ id: 0, name: 'Aerial' }] };
      fetchSpy.mockResolvedValue({
        ok: true,
        json: async () => mockLayers,
      });

      const result = await client.getLayers();

      expect(fetchSpy).toHaveBeenCalledOnce();
      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toBe(`${BASE_URL}/layers?f=json`);
      expect(result).toEqual(mockLayers);
    });

    it('throws on non-ok response', async () => {
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(client.getLayers())
        .rejects
        .toThrow('ArcGIS API error: 404');
    });
  });

  describe('error handling', () => {
    it('propagates network errors from fetch', async () => {
      fetchSpy.mockRejectedValue(new Error('Network failure'));

      await expect(client.queryByPoint(0, 147.0, -42.0))
        .rejects
        .toThrow('Network failure');
    });
  });
});

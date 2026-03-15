import {
  enhancePhoto,
  applyFilters,
  parseFilterParams,
  parseLayerIds,
  sortByDateDesc,
  jsonError,
  jsonSuccess,
} from '@/lib/search-helpers';
import type { SearchPhoto, SearchFilters } from '@/lib/search-helpers';
import type { ArcGISFeature } from '@/lib/arcgis';

// ----------------------------------------------------------------
// enhancePhoto
// ----------------------------------------------------------------
describe('enhancePhoto', () => {
  it('converts a valid feature with FLY_DATE', () => {
    const feature: ArcGISFeature = {
      attributes: {
        OBJECTID: 1,
        IMAGE_NAME: 'test_001',
        FLY_DATE: 1577836800000, // 1 Jan 2020
        SCALE: 15000,
      },
      geometry: { rings: [[[147, -42], [148, -42], [148, -43], [147, -43], [147, -42]]] },
    };

    const result = enhancePhoto(feature, 0);

    expect(result.OBJECTID).toBe(1);
    expect(result.IMAGE_NAME).toBe('test_001');
    expect(result.layerId).toBe(0);
    expect(result.layerType).toBe('aerial');
    expect(result.dateFormatted).toBeTypeOf('string');
    expect(result.dateFormatted).toContain('2020');
    expect(result.scaleFormatted).toBe('1:15,000');
    expect(result.cached).toBe(false);
    expect(result.thumbnailCached).toBe(false);
    expect(result.geometry).toBeDefined();
    expect(result.geometry?.rings).toHaveLength(1);
  });

  it('handles missing FLY_DATE by falling back to CAPTURE_START_DATE', () => {
    const feature: ArcGISFeature = {
      attributes: {
        OBJECTID: 2,
        IMAGE_NAME: 'test_002',
        CAPTURE_START_DATE: 487728000000, // June 1985
        SCALE: 5000,
      },
    };

    const result = enhancePhoto(feature, 1);

    expect(result.layerType).toBe('ortho');
    expect(result.dateFormatted).toContain('1985');
  });

  it('returns null dateFormatted when no date fields exist', () => {
    const feature: ArcGISFeature = {
      attributes: {
        OBJECTID: 3,
        IMAGE_NAME: 'test_003',
      },
    };

    const result = enhancePhoto(feature, 2);

    expect(result.layerType).toBe('digital');
    expect(result.dateFormatted).toBeNull();
    expect(result.scaleFormatted).toBeNull();
  });

  it('maps layer IDs to correct layer types', () => {
    const feature: ArcGISFeature = { attributes: { OBJECTID: 1 } };

    expect(enhancePhoto(feature, 0).layerType).toBe('aerial');
    expect(enhancePhoto(feature, 1).layerType).toBe('ortho');
    expect(enhancePhoto(feature, 2).layerType).toBe('digital');
  });
});

// ----------------------------------------------------------------
// applyFilters
// ----------------------------------------------------------------
describe('applyFilters', () => {
  const photos: SearchPhoto[] = [
    {
      OBJECTID: 1,
      FLY_DATE: new Date('2000-01-01').getTime(),
      SCALE: 10000,
      layerId: 0,
      layerType: 'aerial',
      dateFormatted: '1 January 2000',
      scaleFormatted: '1:10,000',
      cached: false,
      thumbnailCached: false,
    },
    {
      OBJECTID: 2,
      FLY_DATE: new Date('2010-06-15').getTime(),
      SCALE: 25000,
      layerId: 1,
      layerType: 'ortho',
      dateFormatted: '15 June 2010',
      scaleFormatted: '1:25,000',
      cached: false,
      thumbnailCached: false,
    },
    {
      OBJECTID: 3,
      FLY_DATE: new Date('2020-12-31').getTime(),
      SCALE: 5000,
      layerId: 2,
      layerType: 'digital',
      dateFormatted: '31 December 2020',
      scaleFormatted: '1:5,000',
      cached: false,
      thumbnailCached: false,
    },
  ];

  it('returns all photos when no filters are applied', () => {
    const result = applyFilters(photos, {});
    expect(result).toHaveLength(3);
  });

  it('filters by startDate', () => {
    const result = applyFilters(photos, { startDate: '2005-01-01' });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.OBJECTID)).toEqual([2, 3]);
  });

  it('filters by endDate', () => {
    const result = applyFilters(photos, { endDate: '2015-01-01' });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.OBJECTID)).toEqual([1, 2]);
  });

  it('filters by date range (startDate + endDate)', () => {
    const result = applyFilters(photos, {
      startDate: '2005-01-01',
      endDate: '2015-01-01',
    });
    expect(result).toHaveLength(1);
    expect(result[0].OBJECTID).toBe(2);
  });

  it('filters by minScale', () => {
    const result = applyFilters(photos, { minScale: 10000 });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.OBJECTID)).toEqual([1, 2]);
  });

  it('filters by maxScale', () => {
    const result = applyFilters(photos, { maxScale: 10000 });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.OBJECTID)).toEqual([1, 3]);
  });

  it('filters by imageTypes', () => {
    const result = applyFilters(photos, { imageTypes: ['aerial', 'digital'] });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.OBJECTID)).toEqual([1, 3]);
  });

  it('filters by single imageType', () => {
    const result = applyFilters(photos, { imageTypes: ['ortho'] });
    expect(result).toHaveLength(1);
    expect(result[0].OBJECTID).toBe(2);
  });

  it('applies combined filters', () => {
    const result = applyFilters(photos, {
      startDate: '2005-01-01',
      maxScale: 10000,
      imageTypes: ['digital'],
    });
    expect(result).toHaveLength(1);
    expect(result[0].OBJECTID).toBe(3);
  });

  it('returns empty array when nothing matches', () => {
    const result = applyFilters(photos, { imageTypes: ['nonexistent'] });
    expect(result).toHaveLength(0);
  });

  it('passes photos without FLY_DATE through date filters', () => {
    const photosWithMissing: SearchPhoto[] = [
      {
        OBJECTID: 10,
        layerId: 0,
        layerType: 'aerial',
        dateFormatted: null,
        scaleFormatted: null,
        cached: false,
        thumbnailCached: false,
      },
    ];
    // No FLY_DATE means the date filter conditions short-circuit
    const result = applyFilters(photosWithMissing, { startDate: '2020-01-01' });
    expect(result).toHaveLength(1);
  });
});

// ----------------------------------------------------------------
// parseFilterParams
// ----------------------------------------------------------------
describe('parseFilterParams', () => {
  it('parses all filter params from URL', () => {
    const url = new URL('https://example.com/search?startDate=2000-01-01&endDate=2020-12-31&minScale=5000&maxScale=25000&imageTypes=aerial,ortho');
    const result = parseFilterParams(url);
    expect(result).toEqual({
      startDate: '2000-01-01',
      endDate: '2020-12-31',
      minScale: 5000,
      maxScale: 25000,
      imageTypes: ['aerial', 'ortho'],
    });
  });

  it('returns undefined for all fields when no params present', () => {
    const url = new URL('https://example.com/search');
    const result = parseFilterParams(url);
    expect(result).toEqual({
      startDate: undefined,
      endDate: undefined,
      minScale: undefined,
      maxScale: undefined,
      imageTypes: undefined,
    });
  });

  it('parses partial params correctly', () => {
    const url = new URL('https://example.com/search?startDate=2010-01-01&imageTypes=digital');
    const result = parseFilterParams(url);
    expect(result.startDate).toBe('2010-01-01');
    expect(result.endDate).toBeUndefined();
    expect(result.minScale).toBeUndefined();
    expect(result.maxScale).toBeUndefined();
    expect(result.imageTypes).toEqual(['digital']);
  });

  it('parses scale values as numbers', () => {
    const url = new URL('https://example.com/search?minScale=1000.5&maxScale=50000');
    const result = parseFilterParams(url);
    expect(result.minScale).toBe(1000.5);
    expect(result.maxScale).toBe(50000);
  });
});

// ----------------------------------------------------------------
// parseLayerIds
// ----------------------------------------------------------------
describe('parseLayerIds', () => {
  it('returns default [0, 1, 2] when no layers param', () => {
    const url = new URL('https://example.com/search');
    expect(parseLayerIds(url)).toEqual([0, 1, 2]);
  });

  it('parses custom layer IDs', () => {
    const url = new URL('https://example.com/search?layers=0,2');
    expect(parseLayerIds(url)).toEqual([0, 2]);
  });

  it('parses single layer ID', () => {
    const url = new URL('https://example.com/search?layers=1');
    expect(parseLayerIds(url)).toEqual([1]);
  });

  it('filters out NaN values from invalid input', () => {
    const url = new URL('https://example.com/search?layers=0,abc,2');
    expect(parseLayerIds(url)).toEqual([0, 2]);
  });
});

// ----------------------------------------------------------------
// sortByDateDesc
// ----------------------------------------------------------------
describe('sortByDateDesc', () => {
  it('sorts photos by FLY_DATE descending', () => {
    const photos: SearchPhoto[] = [
      { FLY_DATE: 100, layerId: 0, layerType: 'aerial', dateFormatted: null, scaleFormatted: null, cached: false, thumbnailCached: false },
      { FLY_DATE: 300, layerId: 0, layerType: 'aerial', dateFormatted: null, scaleFormatted: null, cached: false, thumbnailCached: false },
      { FLY_DATE: 200, layerId: 0, layerType: 'aerial', dateFormatted: null, scaleFormatted: null, cached: false, thumbnailCached: false },
    ];
    const sorted = sortByDateDesc(photos);
    expect(sorted.map((p) => p.FLY_DATE)).toEqual([300, 200, 100]);
  });

  it('sorts photos without FLY_DATE to the end', () => {
    const photos: SearchPhoto[] = [
      { layerId: 0, layerType: 'aerial', dateFormatted: null, scaleFormatted: null, cached: false, thumbnailCached: false },
      { FLY_DATE: 100, layerId: 0, layerType: 'aerial', dateFormatted: null, scaleFormatted: null, cached: false, thumbnailCached: false },
    ];
    const sorted = sortByDateDesc(photos);
    expect(sorted[0].FLY_DATE).toBe(100);
    expect(sorted[1].FLY_DATE).toBeUndefined();
  });
});

// ----------------------------------------------------------------
// jsonError / jsonSuccess
// ----------------------------------------------------------------
describe('jsonError', () => {
  it('returns a Response with error payload and correct status', async () => {
    const response = jsonError('Not found', 404);
    expect(response.status).toBe(404);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = await response.json();
    expect(body).toEqual({ success: false, error: 'Not found' });
  });
});

describe('jsonSuccess', () => {
  it('returns a 200 Response with success payload', async () => {
    const data = { photos: [1, 2, 3] };
    const response = jsonSuccess(data);
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const body = await response.json();
    expect(body).toEqual({ success: true, data: { photos: [1, 2, 3] } });
  });
});

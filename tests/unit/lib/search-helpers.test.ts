import {
  enhancePhoto,
  applyFilters,
  parseFilterParams,
  parseLayerIds,
  sortByDateDesc,
  jsonError,
  jsonSuccess,
} from '@/lib/search-helpers';
import type { SearchFilters } from '@/lib/search-helpers';
import type { ArcGISFeature } from '@/lib/arcgis';
import type { EnhancedPhoto } from '@/types/photo';

// ----------------------------------------------------------------
// enhancePhoto
// ----------------------------------------------------------------
describe('enhancePhoto', () => {
  it('converts a valid feature with FLY_DATE', () => {
    const feature: ArcGISFeature = {
      attributes: {
        OBJECTID: 1,
        IMAGE_NAME: 'test_001.tif',
        FLY_DATE: 1577836800000, // 1 Jan 2020
        SCALE: 15000,
        IMAGE_TYPE: 'Black & White',
        RUN_NO: '3',
        HEIGHT: 5000,
        FRAME: '42',
        PROJ_NAME: 'Hobart Project',
        'SHAPE.AREA': 1234567,
        THUMBNAIL_LINK: 'https://example.com/thumb.jpg',
        DOWNLOAD_LINK: 'https://example.com/test.tif',
      },
      geometry: {
        rings: [
          [
            [147, -42],
            [148, -42],
            [148, -43],
            [147, -43],
            [147, -42],
          ],
        ],
      },
    };

    const result = enhancePhoto(feature, 0);

    expect(result.objectId).toBe(1);
    expect(result.name).toBe('test_001');
    expect(result.layerId).toBe(0);
    expect(result.year).toBe(2020);
    expect(result.dateFlown).toBe(1577836800000);
    expect(result.scale).toBe(15000);
    expect(result.type).toBe('Black & White');
    expect(result.run).toBe('3');
    expect(result.altitude).toBe(5000);
    expect(result.photoNo).toBe('42');
    expect(result.layerName).toBe('Hobart Project');
    expect(result.area).toBe(1234567);
    expect(result.thumbnailUrl).toBe('https://example.com/thumb.jpg');
    expect(result.tiffUrl).toBe('https://example.com/test.tif');
    expect(result.imageUrl).toBe('/api/images/webp/0/test_001');
    expect(result.rings).toHaveLength(1);
  });

  it('handles missing FLY_DATE by falling back to CAPTURE_START_DATE', () => {
    const feature: ArcGISFeature = {
      attributes: {
        OBJECTID: 2,
        IMAGE_NAME: 'test_002.tif',
        CAPTURE_START_DATE: 487728000000, // June 1985
        SCALE: 5000,
      },
    };

    const result = enhancePhoto(feature, 1);

    expect(result.layerId).toBe(1);
    expect(result.year).toBe(1985);
    expect(result.dateFlown).toBe(487728000000);
  });

  it('returns year 0 when no date fields exist', () => {
    const feature: ArcGISFeature = {
      attributes: {
        OBJECTID: 3,
        IMAGE_NAME: 'test_003',
      },
    };

    const result = enhancePhoto(feature, 2);

    expect(result.layerId).toBe(2);
    expect(result.year).toBe(0);
    expect(result.dateFlown).toBe(0);
    expect(result.scale).toBe(0);
  });

  it('strips .tif extension from IMAGE_NAME', () => {
    const feature: ArcGISFeature = {
      attributes: { OBJECTID: 1, IMAGE_NAME: 'photo_123.tif' },
    };
    expect(enhancePhoto(feature, 0).name).toBe('photo_123');
  });

  it('handles IMAGE_NAME without .tif extension', () => {
    const feature: ArcGISFeature = {
      attributes: { OBJECTID: 1, IMAGE_NAME: 'photo_123' },
    };
    expect(enhancePhoto(feature, 0).name).toBe('photo_123');
  });
});

// ----------------------------------------------------------------
// applyFilters
// ----------------------------------------------------------------
describe('applyFilters', () => {
  function makePhoto(overrides: Partial<EnhancedPhoto>): EnhancedPhoto {
    return {
      objectId: 0,
      layerId: 0,
      name: 'test',
      type: '',
      run: '',
      dateFlown: 0,
      year: 0,
      scale: 0,
      filmType: '',
      altitude: 0,
      photoNo: '',
      layerName: '',
      area: 0,
      thumbnailUrl: '',
      imageUrl: '',
      tiffUrl: '',
      rings: [],
      ...overrides,
    };
  }

  const photos: EnhancedPhoto[] = [
    makePhoto({
      objectId: 1,
      dateFlown: new Date('2000-01-01').getTime(),
      scale: 10000,
      layerId: 0,
    }),
    makePhoto({
      objectId: 2,
      dateFlown: new Date('2010-06-15').getTime(),
      scale: 25000,
      layerId: 1,
    }),
    makePhoto({
      objectId: 3,
      dateFlown: new Date('2020-12-31').getTime(),
      scale: 5000,
      layerId: 2,
    }),
  ];

  it('returns all photos when no filters are applied', () => {
    const result = applyFilters(photos, {});
    expect(result).toHaveLength(3);
  });

  it('filters by startDate', () => {
    const result = applyFilters(photos, { startDate: '2005-01-01' });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.objectId)).toEqual([2, 3]);
  });

  it('filters by endDate', () => {
    const result = applyFilters(photos, { endDate: '2015-01-01' });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.objectId)).toEqual([1, 2]);
  });

  it('filters by date range (startDate + endDate)', () => {
    const result = applyFilters(photos, {
      startDate: '2005-01-01',
      endDate: '2015-01-01',
    });
    expect(result).toHaveLength(1);
    expect(result[0].objectId).toBe(2);
  });

  it('filters by minScale', () => {
    const result = applyFilters(photos, { minScale: 10000 });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.objectId)).toEqual([1, 2]);
  });

  it('filters by maxScale', () => {
    const result = applyFilters(photos, { maxScale: 10000 });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.objectId)).toEqual([1, 3]);
  });

  it('filters by imageTypes', () => {
    const result = applyFilters(photos, { imageTypes: ['aerial', 'digital'] });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.objectId)).toEqual([1, 3]);
  });

  it('filters by single imageType', () => {
    const result = applyFilters(photos, { imageTypes: ['ortho'] });
    expect(result).toHaveLength(1);
    expect(result[0].objectId).toBe(2);
  });

  it('applies combined filters', () => {
    const result = applyFilters(photos, {
      startDate: '2005-01-01',
      maxScale: 10000,
      imageTypes: ['digital'],
    });
    expect(result).toHaveLength(1);
    expect(result[0].objectId).toBe(3);
  });

  it('returns empty array when nothing matches', () => {
    const result = applyFilters(photos, { imageTypes: ['nonexistent'] });
    expect(result).toHaveLength(0);
  });

  it('passes photos without dateFlown through date filters', () => {
    const photosNoDate = [makePhoto({ objectId: 10, dateFlown: 0 })];
    const result = applyFilters(photosNoDate, { startDate: '2020-01-01' });
    expect(result).toHaveLength(1);
  });
});

// ----------------------------------------------------------------
// parseFilterParams
// ----------------------------------------------------------------
describe('parseFilterParams', () => {
  it('parses all filter params from URL', () => {
    const url = new URL(
      'https://example.com/search?startDate=2000-01-01&endDate=2020-12-31&minScale=5000&maxScale=25000&imageTypes=aerial,ortho',
    );
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
  function makePhoto(overrides: Partial<EnhancedPhoto>): EnhancedPhoto {
    return {
      objectId: 0,
      layerId: 0,
      name: '',
      type: '',
      run: '',
      dateFlown: 0,
      year: 0,
      scale: 0,
      filmType: '',
      altitude: 0,
      photoNo: '',
      layerName: '',
      area: 0,
      thumbnailUrl: '',
      imageUrl: '',
      tiffUrl: '',
      rings: [],
      ...overrides,
    };
  }

  it('sorts photos by dateFlown descending', () => {
    const photos = [
      makePhoto({ dateFlown: 100 }),
      makePhoto({ dateFlown: 300 }),
      makePhoto({ dateFlown: 200 }),
    ];
    const sorted = sortByDateDesc(photos);
    expect(sorted.map((p) => p.dateFlown)).toEqual([300, 200, 100]);
  });

  it('sorts photos without dateFlown to the end', () => {
    const photos = [makePhoto({ dateFlown: 0 }), makePhoto({ dateFlown: 100 })];
    const sorted = sortByDateDesc(photos);
    expect(sorted[0].dateFlown).toBe(100);
    expect(sorted[1].dateFlown).toBe(0);
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

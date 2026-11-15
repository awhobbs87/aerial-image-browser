/**
 * ArcGIS REST API client for Tasmania LIST aerial photo services.
 * Queries the MapServer for photo features by point or bounds.
 */

const COMMON_FIELDS = 'OBJECTID,IMAGE_NAME,IMAGE_TYPE,DOWNLOAD_LINK,THUMBNAIL_LINK,SHAPE.AREA';
const PHOTO_FIELDS = `${COMMON_FIELDS},FILM_NO,FRAME,RUN_NO,FLY_DATE,SCALE,PROJ_NAME,HEIGHT`;
const DIGITAL_FIELDS = `${COMMON_FIELDS},PROJECT_NAME,CAPTURE_START_DATE`;

interface ClientOptions {
  kv?: KVNamespace;
  refresh?: boolean;
  primeMediaSources?: boolean;
  defer?: (task: Promise<unknown>) => void;
  signal?: AbortSignal;
}

export class ArcGISClient {
  constructor(
    private baseUrl: string,
    private options: ClientOptions = {},
  ) {}

  private async query(layerId: number, params: URLSearchParams): Promise<ArcGISFeature[]> {
    params.set('outFields', layerId === 2 ? DIGITAL_FIELDS : PHOTO_FIELDS);
    params.set('orderByFields', 'OBJECTID ASC');
    params.set('resultRecordCount', '1000');
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(`${this.baseUrl}:${layerId}:${params}`),
    );
    const key = `search:v3:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    // Cache failures must not prevent a search. Coordinates are not rounded: small
    // changes can cross footprint boundaries and produce genuinely different results.
    const cached = this.options.refresh
      ? null
      : await this.options.kv?.get<ArcGISFeature[]>(key, 'json').catch(() => null);
    if (cached) return cached;
    // LIST's spatial offset pages can overlap even at exact page-size offsets.
    // Resolve the complete matching ID set first, then fetch bounded ID batches
    // without the spatial predicate so pagination cannot skip or repeat matches.
    let matchingIds: number[] | undefined;
    if (params.get('geometryType') === 'esriGeometryEnvelope') {
      const idParams = new URLSearchParams(params);
      idParams.set('returnIdsOnly', 'true');
      idParams.set('returnGeometry', 'false');
      for (const name of ['outFields', 'orderByFields', 'resultRecordCount']) idParams.delete(name);
      const response = await fetch(`${this.baseUrl}/${layerId}/query?${idParams}`, {
        signal: this.options.signal,
      });
      if (!response.ok) throw new Error(`ArcGIS API error: ${response.status}`);
      const data = (await response.json()) as {
        objectIds?: number[] | null;
        error?: { message?: string };
      };
      if (data.error) throw new Error(data.error.message || 'ArcGIS ID query failed');
      if (data.objectIds !== null && !Array.isArray(data.objectIds))
        throw new Error('ArcGIS returned an invalid ID list');
      matchingIds = [...new Set(data.objectIds || [])].sort((a, b) => a - b);
      if (matchingIds.length > 50000)
        throw new Error('Search area is too large; choose a smaller area');
      for (const name of ['geometry', 'geometryType', 'inSR', 'spatialRel']) params.delete(name);
      params.set('resultRecordCount', '500');
    }
    const features: ArcGISFeature[] = [];
    const ids = new Set<unknown>();
    for (let page = 0; page < 100; page++) {
      const requestedIds = matchingIds?.slice(page * 500, (page + 1) * 500);
      if (requestedIds) params.set('objectIds', requestedIds.join(','));
      else params.set('resultOffset', String(features.length));
      let data: ArcGISQueryResponse = { features: [] };
      if (!requestedIds || requestedIds.length) {
        const response = await fetch(`${this.baseUrl}/${layerId}/query?${params}`, {
          signal: this.options.signal,
        });
        if (!response.ok) throw new Error(`ArcGIS API error: ${response.status}`);
        data = (await response.json()) as ArcGISQueryResponse;
        if (data.error) throw new Error(data.error.message || 'ArcGIS query failed');
      }
      const batch = data.features || [];
      if (
        requestedIds &&
        (data.exceededTransferLimit ||
          batch.length !== requestedIds.length ||
          batch.some((feature) => !requestedIds.includes(Number(feature.attributes.OBJECTID))))
      )
        throw new Error('ArcGIS returned an incomplete ID batch');
      for (const feature of batch) {
        const id = feature.attributes.OBJECTID;
        if (ids.has(id)) throw new Error('ArcGIS returned a repeated page');
        ids.add(id);
        features.push(feature);
      }
      if (matchingIds ? (page + 1) * 500 >= matchingIds.length : !data.exceededTransferLimit) {
        if (this.options.kv && this.options.primeMediaSources && this.options.defer) {
          const kv = this.options.kv;
          const recent = [...features]
            .sort(
              (a, b) =>
                Number(b.attributes.FLY_DATE || b.attributes.CAPTURE_START_DATE || 0) -
                Number(a.attributes.FLY_DATE || a.attributes.CAPTURE_START_DATE || 0),
            )
            .slice(0, 8);
          this.options.defer(
            Promise.all(
              recent.flatMap(({ attributes }) => {
                const name =
                  typeof attributes.IMAGE_NAME === 'string'
                    ? attributes.IMAGE_NAME.replace(/\.tif$/i, '')
                    : '';
                if (!name) return [];
                return [
                  ['photo-source', attributes.THUMBNAIL_LINK],
                  ['photo-tiff-source', attributes.DOWNLOAD_LINK],
                ].flatMap(([prefix, link]) =>
                  typeof link === 'string' && /^https?:\/\//.test(link)
                    ? [kv.put(`${prefix}:v1:${layerId}:${name}`, link, { expirationTtl: 86400 })]
                    : [],
                );
              }),
            ).catch((error: unknown) => console.warn('Photo source priming failed', error)),
          );
        }
        if (this.options.kv) {
          const write = this.options.kv
            .put(key, JSON.stringify(features), { expirationTtl: 900 })
            .catch((error: unknown) => console.warn('Search cache write failed', error));
          if (this.options.defer) this.options.defer(write);
          else await write;
        }
        return features;
      }
      if (!matchingIds && !batch.length) throw new Error('ArcGIS returned an incomplete search');
    }
    throw new Error('Search area is too large; choose a smaller area');
  }

  async queryByPoint(layerId: number, lon: number, lat: number): Promise<ArcGISFeature[]> {
    const params = new URLSearchParams({
      f: 'json',
      geometry: `${lon},${lat}`,
      geometryType: 'esriGeometryPoint',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
    });

    return this.query(layerId, params);
  }

  async queryByBounds(
    layerId: number,
    west: number,
    south: number,
    east: number,
    north: number,
  ): Promise<ArcGISFeature[]> {
    const geometry = JSON.stringify({
      xmin: west,
      ymin: south,
      xmax: east,
      ymax: north,
      spatialReference: { wkid: 4326 },
    });

    const params = new URLSearchParams({
      f: 'json',
      geometry,
      geometryType: 'esriGeometryEnvelope',
      inSR: '4326',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: '*',
      returnGeometry: 'true',
      outSR: '4326',
    });

    return this.query(layerId, params);
  }

  async getLayers(): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}/layers?f=json`);
    if (!response.ok) throw new Error(`ArcGIS API error: ${response.status}`);
    return await response.json();
  }
}

/** Raw ArcGIS feature from query response */
export interface ArcGISFeature {
  attributes: Record<string, unknown>;
  geometry?: {
    rings?: number[][][];
  };
}

/** ArcGIS query response envelope */
interface ArcGISQueryResponse {
  features?: ArcGISFeature[];
  exceededTransferLimit?: boolean;
  error?: { message?: string };
}

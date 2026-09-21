/**
 * ArcGIS REST API client for Tasmania LIST aerial photo services.
 * Queries the MapServer for photo features by point or bounds.
 */

const COMMON_FIELDS = 'OBJECTID,IMAGE_NAME,IMAGE_TYPE,DOWNLOAD_LINK,THUMBNAIL_LINK,SHAPE.AREA';
const PHOTO_FIELDS = `${COMMON_FIELDS},FILM_NO,FRAME,RUN_NO,FLY_DATE,SCALE,PROJ_NAME,HEIGHT`;
const DIGITAL_FIELDS = `${COMMON_FIELDS},PROJECT_NAME,CAPTURE_START_DATE`;

interface ClientOptions {
  kv?: KVNamespace;
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
    const key = `search:v2:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
    // Cache failures must not prevent a search. Coordinates are not rounded: small
    // changes can cross footprint boundaries and produce genuinely different results.
    const cached = await this.options.kv?.get<ArcGISFeature[]>(key, 'json').catch(() => null);
    if (cached) return cached;
    const features: ArcGISFeature[] = [];
    const ids = new Set<unknown>();
    for (let page = 0; page < 100; page++) {
      params.set('resultOffset', String(features.length));
      const response = await fetch(`${this.baseUrl}/${layerId}/query?${params}`, {
        signal: this.options.signal,
      });
      if (!response.ok) throw new Error(`ArcGIS API error: ${response.status}`);
      const data = (await response.json()) as ArcGISQueryResponse;
      if (data.error) throw new Error(data.error.message || 'ArcGIS query failed');
      const batch = data.features || [];
      for (const feature of batch) {
        const id = feature.attributes.OBJECTID;
        if (ids.has(id)) throw new Error('ArcGIS returned a repeated page');
        ids.add(id);
        features.push(feature);
      }
      if (!data.exceededTransferLimit) {
        if (this.options.kv) {
          const write = this.options.kv
            .put(key, JSON.stringify(features), { expirationTtl: 900 })
            .catch((error: unknown) => console.warn('Search cache write failed', error));
          if (this.options.defer) this.options.defer(write);
          else await write;
        }
        return features;
      }
      if (!batch.length) throw new Error('ArcGIS returned an incomplete search');
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

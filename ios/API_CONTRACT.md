# Native API Contract Draft

The iOS app should consume a stable `/api/v1` API. The Worker may internally call ArcGIS, R2, KV, D1, Workers AI, or an external TIFF service, but those details should not leak into the native client.

## Response Envelope

Successful collection:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "requestId": "req_123",
    "cache": "HIT"
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "PHOTO_NOT_FOUND",
    "message": "Photo not found"
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

## Core Endpoints

```text
GET /api/v1/health
GET /api/v1/layers
GET /api/v1/search/location?lat=-43.0292&lng=147.0502&radius=2000
GET /api/v1/search/bounds?north=-42.9&south=-43.1&east=147.2&west=146.9
GET /api/v1/photos/{photoId}
GET /api/v1/photos/{photoId}/thumbnail
GET /api/v1/photos/{photoId}/preview
GET /api/v1/photos/{photoId}/tiff
GET /api/v1/photos/{photoId}/tile-manifest
GET /api/v1/photos/{photoId}/tiles/{z}/{x}/{y}.webp
```

## Photo Model

```json
{
  "id": "0:ABC_123",
  "layerId": 0,
  "imageName": "ABC_123",
  "title": "ABC_123",
  "year": 1968,
  "captureDate": "1968-02-14",
  "photoType": "Aerial",
  "project": "Example project",
  "scale": 15840,
  "centroid": {
    "lat": -43.0292,
    "lng": 147.0502
  },
  "bounds": {
    "north": -43.01,
    "south": -43.05,
    "east": 147.08,
    "west": 147.02
  },
  "footprint": {
    "type": "Polygon",
    "coordinates": []
  },
  "links": {
    "thumbnail": "/api/v1/photos/0:ABC_123/thumbnail",
    "preview": "/api/v1/photos/0:ABC_123/preview",
    "tileManifest": "/api/v1/photos/0:ABC_123/tile-manifest",
    "tiff": "/api/v1/photos/0:ABC_123/tiff"
  }
}
```

## Tile Manifest

```json
{
  "photoId": "0:ABC_123",
  "format": "webp",
  "width": 18000,
  "height": 12000,
  "tileSize": 512,
  "overlap": 0,
  "levels": [
    { "z": 0, "width": 563, "height": 375, "columns": 2, "rows": 1 },
    { "z": 1, "width": 1125, "height": 750, "columns": 3, "rows": 2 },
    { "z": 2, "width": 2250, "height": 1500, "columns": 5, "rows": 3 },
    { "z": 3, "width": 4500, "height": 3000, "columns": 9, "rows": 6 },
    { "z": 4, "width": 9000, "height": 6000, "columns": 18, "rows": 12 },
    { "z": 5, "width": 18000, "height": 12000, "columns": 36, "rows": 24 }
  ],
  "tileUrlTemplate": "/api/v1/photos/0:ABC_123/tiles/{z}/{x}/{y}.webp",
  "source": {
    "type": "tiff",
    "rangeUrl": "/api/v1/photos/0:ABC_123/tiff",
    "supportsRange": true
  }
}
```

## TIFF Range Endpoint

The direct TIFF endpoint must support standard HTTP range requests.

Request:

```http
GET /api/v1/photos/0:ABC_123/tiff HTTP/1.1
Range: bytes=0-16383
```

Response:

```http
HTTP/1.1 206 Partial Content
Content-Type: image/tiff
Accept-Ranges: bytes
Content-Range: bytes 0-16383/123456789
Content-Length: 16384
Cache-Control: public, max-age=31536000, immutable
```

## Cache Rules

Recommended defaults:

```text
Layer metadata:       public, max-age=86400
Search responses:    public, max-age=300
Photo metadata:      public, max-age=86400
Thumbnails:          public, max-age=31536000, immutable
Previews:            public, max-age=31536000, immutable
Tile manifests:      public, max-age=31536000, immutable
Tiles:               public, max-age=31536000, immutable
Source TIFF ranges:  public, max-age=31536000, immutable
```

## Cloudflare Runtime

Native tile generation is deployed as a Cloudflare Container-backed Worker:

- app Worker binding: `TIFF_TILE_SERVICE`;
- tile Worker name: `tas-aerial-tiff-tiles`;
- tile Worker endpoints: `POST /tiles/manifest`, `POST /tiles/generate`;
- local fallback var: `TIFF_CONVERSION_SERVICE_URL=http://127.0.0.1:8788`.

See `ios/CLOUDFLARE_DEPLOYMENT.md` for the deployment sequence and smoke tests.

## Open Questions

- Should `photoId` be opaque or structured as `{layerId}:{imageName}`?
- Should generated tiles be created on first request or precomputed for all viewed photos?
- Should the iOS app use anonymous local favorites first, or should D1 sync be part of the first beta?
- Should `tile-manifest` use a Deep Zoom Image compatible shape to allow reuse of existing viewers?

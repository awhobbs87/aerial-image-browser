# TIFF Tile Service

Small Node service that turns source TIFF/GeoTIFF files into mobile-friendly WebP tiles for the native iOS API.

The Cloudflare Worker remains the public API, R2 cache, and ArcGIS boundary. This service does the CPU-heavy TIFF range reading and WebP encoding that should not run in the Worker route.

## Endpoints

```text
GET  /health
POST /tiles/manifest
POST /tiles/generate
```

`/tiles/manifest` accepts:

```json
{
  "photoId": "2:Hobart_25cm_2019_5275252",
  "tiffUrl": "https://...",
  "tileUrlTemplate": "https://app/api/v1/photos/.../tiles/{z}/{x}/{y}.webp",
  "rangeUrl": "https://app/api/v1/photos/.../tiff",
  "tileSize": 512,
  "format": "webp"
}
```

`/tiles/generate` accepts the same payload plus `z`, `x`, and `y`, and returns `image/webp`.

## Local Development

```bash
npm install
npm run dev
```

Point the app Worker at it with:

```bash
TIFF_CONVERSION_SERVICE_URL=http://127.0.0.1:8788
```

## Cloudflare Deployment

This service deploys as a Cloudflare Container-backed Worker named `tas-aerial-tiff-tiles`.

```bash
npm run deploy:tiff-tiles
```

The app Worker binds to it through `TIFF_TILE_SERVICE` in the root `wrangler.jsonc`. Deploy this service before deploying the app Worker.

Cloudflare Containers require Docker or a compatible Docker CLI/daemon locally so Wrangler can build and push the container image. If Docker is installed under a non-standard command or socket, set `WRANGLER_DOCKER_BIN` and/or `DOCKER_HOST`.

Dry-run:

```bash
npm run deploy:tiff-tiles:dry-run
```

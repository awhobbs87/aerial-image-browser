# Cloudflare Deployment Architecture

The native iOS app should call Cloudflare, not a local Astro server, outside simulator-only development.

```text
iOS app
  -> Cloudflare Worker: tas-aerial-browser
      -> R2/KV/D1/Workers AI
      -> Service binding: TIFF_TILE_SERVICE
          -> Cloudflare Worker: tas-aerial-tiff-tiles
              -> Cloudflare Container: TiffTileContainer
                  -> geotiff range reads + sharp WebP encoding
```

## Services

### App Worker

Public API and cache boundary:

- `/api/v1/search/location`
- `/api/v1/photos/{photoId}/tile-manifest`
- `/api/v1/photos/{photoId}/tiles/{z}/{x}/{y}.webp`
- `/api/v1/photos/{photoId}/tiff`

Config: `/Users/awhob/dev/tas-aerial-explorer/wrangler.jsonc`

### TIFF Tile Worker + Container

Private generation service behind the app Worker service binding:

- `POST /tiles/manifest`
- `POST /tiles/generate`

Config: `/Users/awhob/dev/tas-aerial-explorer/services/tiff-tile-service/wrangler.jsonc`

Container image: `/Users/awhob/dev/tas-aerial-explorer/services/tiff-tile-service/Dockerfile`

## Local Development

Run the tile generator:

```bash
npm run dev:tiff-tiles
```

Run the app Worker:

```bash
npm run dev
```

`.dev.vars` should point the app Worker at the local tile service:

```bash
TIFF_CONVERSION_SERVICE_URL=http://127.0.0.1:8788
```

The app Worker prefers that local URL over the service binding when it is set to `localhost` or `127.0.0.1`.

## Cloudflare Deployment

Deploy the tile service first, then the app Worker:

```bash
npm run deploy:tiff-tiles
npm run deploy
```

Or deploy both in order:

```bash
npm run deploy:cloudflare
```

The app Worker `TIFF_TILE_SERVICE` binding points at the deployed `tas-aerial-tiff-tiles` Worker. In Cloudflare, the normal production path should not need `TIFF_CONVERSION_SERVICE_URL`.

Wrangler builds the Container image through Docker. Install and start Docker Desktop, or provide compatible tooling through:

```bash
WRANGLER_DOCKER_BIN=/path/to/docker
DOCKER_HOST=unix:///path/to/docker.sock
```

## Smoke Tests

After deployment:

```bash
curl -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
  https://aerial-api.awhq.uk/v1/health

curl -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
  "https://aerial-api.awhq.uk/v1/search/location?lat=-42.8821&lng=147.3272&layers=0,1,2"

curl -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
  "https://aerial-api.awhq.uk/v1/photos/2%3AHobart_25cm_2019_5275252/tile-manifest"

curl -I -H "CF-Access-Client-Id: $CF_ACCESS_CLIENT_ID" \
  -H "CF-Access-Client-Secret: $CF_ACCESS_CLIENT_SECRET" \
  "https://aerial-api.awhq.uk/v1/photos/2%3AHobart_25cm_2019_5275252/tiles/2/0/0.webp"
```

The first tile request may be a miss while the Container generates the tile. Repeating the tile request should return an R2 cache hit from the app Worker.

`aerial-api.awhq.uk` must have a proxied DNS record in Cloudflare. A Worker route does not create DNS by itself.

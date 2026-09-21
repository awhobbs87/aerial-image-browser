# Performance implementation — 2026-09-21

Implemented the seven audit priorities for desktop and mobile:

1. Footprint geometry and event listeners stay stable during hover; feature-state updates identify photos by layer and object ID. Style reloads restore the source and layers.
2. ArcGIS queries request selected fields, paginate completely, reject incomplete/error results and cache complete geographic results in KV for 15 minutes. Browser filters operate on cached results, with cancellation for superseded search/geocoding requests.
3. Cards request 320/640/960 WebP variants with responsive `srcset`; previews and the viewer share a 1600 variant. Source metadata is cached in KV, originals/variants in R2, and responses at the edge. Named presets bound transformations; failed transformations fall back briefly without polluting variant storage.
4. The viewer displays its preview immediately, starts OpenSeadragon and GeoTIFF imports together, and retains the preview underneath the full-resolution image until tiles are ready. Zoom label updates are throttled.
5. MapLibre loads separately after search controls hydrate. Navigation hydrates for the matching viewport. CSS is minified and prefetch defaults to hover.
6. A browser-only shared QueryClient survives Astro navigation. Search view state retains loaded cards, grouping and scroll in a bounded 20-entry in-memory cache. Neither survives a full browser reload; SSR requests do not share query data.
7. The service worker handles thumbnails before general API exclusions, bounds caches, honors response cache policy, bypasses TIFF ranges and personalized APIs, and uses an abortable navigation timeout with offline fallback.

## Cloudflare

Enabled and verified Image Transformations on the Enterprise `awhq.uk` zone with the owner's authorization. The application now declares the `IMAGES` Workers binding, to take effect on deployment. Existing Web Analytics is already enabled. Existing KV/R2 resources and the Workers Cache API supply the cache layers; no new storage resources were needed. Cloudflare Access configuration was preserved.

References: [Images binding](https://developers.cloudflare.com/images/optimization/binding/), [Workers Cache API](https://developers.cloudflare.com/workers/runtime-apis/cache/), [Web Analytics](https://developers.cloudflare.com/web-analytics/about/).

## Local measurements

| Measurement | Before | After |
| --- | ---: | ---: |
| Main search entry chunk, uncompressed | 1,214.6 KB | 353.8 KB |
| Main search entry chunk, gzip | 337.5 KB | 77.9 KB |
| Shared AppLayout CSS, uncompressed | 263.2 KB | 216.0 KB |
| Shared AppLayout CSS, gzip | 36.1 KB | 33.4 KB |
| Sample photo `1439_183`, original JPEG versus 320 card | 254,999 bytes | 22,114 bytes |

The separate MapView chunk is 1,076,596 bytes (280,363 gzip). Splitting removes it from the search-control startup dependency; it does not remove its eventual download. One real Hobart query took approximately 1,096 ms cold and 119 ms on a local repeat. These are local observations, not production latency or Core Web Vitals claims. Preview variants emphasize detail and can be larger than the source JPEG.

Verified real-source image responses for transformation, R2 reuse and edge hits. R2 writes buffer only background cache copies with a 16 MiB cap; the foreground response streams. Immutable cached responses are copied before middleware adds headers.

## Validation and limits

- 235 unit/component tests pass, covering hover stability, pagination/cache policy, filtering/query reuse, media caching/fallback, and service-worker expiry, capacity, offline, range and authentication handling.
- Type-check, lint, production build and whitespace checks pass.
- Production-preview browser coverage exercises desktop/mobile cached filtering, loaded-card and scroll restoration, same-document navigation, preview/viewer fallback, and search controls while map code is delayed. Existing smoke tests were updated to use current Kumo labels and roles.
- Existing explicitly skipped E2E scenarios remain skipped. A real successful full-resolution TIFF upgrade and production Core Web Vitals still need post-deployment measurement; automated viewer tests deliberately exercise TIFF failure with a usable preview.
- This change is prepared for the repository's normal deployment process. The Cloudflare zone setting is enabled; application code and its binding require deployment.

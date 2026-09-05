# iOS Project Plan

## Goal

Build a native iOS app that lets users search, browse, view, compare, and save Tasmanian aerial imagery using a Cloudflare-backed API ecosystem. The app should feel native on iPhone first, with iPad support after the core flows are stable.

## Product Principles

- MapKit is for geographic browsing, search context, user location, and photo footprints.
- The aerial photo viewer is separate from MapKit and consumes Cloudflare image tiles.
- Cloudflare owns ArcGIS integration, TIFF access, caching, tile generation, and API normalization.
- The iOS app should not need to know ArcGIS service quirks.
- The first TestFlight build should prove the full search-map-viewer loop before advanced features.
- The existing web app is backend/architecture reference only. Do not port its UI, styling, navigation, or component model.
- The iOS UI must be freshly designed around SwiftUI, Apple Human Interface Guidelines, and the Liquid Glass look for system controls/navigation.

## Phase 0: Decisions And Contracts

- [ ] Choose minimum iOS target. Recommended: iOS 18 unless there is a strong reason to support older devices.
- [ ] Confirm app name, bundle identifier, and Apple developer team.
- [ ] Decide whether the first release is free, paid, or free with future paid features.
- [ ] Define `/api/v1` response models and error envelopes.
- [ ] Decide initial auth posture: anonymous-only, Cloudflare Access, Sign in with Apple, or app-scoped anonymous IDs.
- [ ] Decide whether first viewer uses Cloudflare-generated tiles or a `WKWebView` bridge to the existing web viewer.
- [ ] Produce first native UI sketches/wireframes from `UI_DESIGN.md`, not from the web app.

## Phase 1: Cloudflare API Foundation

- [ ] Add versioned API namespace: `/api/v1`.
- [ ] Add `GET /api/v1/health`.
- [ ] Add `GET /api/v1/layers`.
- [ ] Add `GET /api/v1/search/location`.
- [ ] Add `GET /api/v1/search/bounds`.
- [ ] Add `GET /api/v1/photos/{photoId}`.
- [ ] Add `GET /api/v1/photos/{photoId}/thumbnail`.
- [ ] Add `GET /api/v1/photos/{photoId}/preview`.
- [ ] Add `GET /api/v1/photos/{photoId}/tiff` with HTTP Range support.
- [ ] Add `GET /api/v1/photos/{photoId}/tile-manifest`.
- [ ] Add `GET /api/v1/photos/{photoId}/tiles/{z}/{x}/{y}.webp`.
- [ ] Add `HEAD` support for source TIFF and tile resources where useful.
- [ ] Add stable cache headers and ETags for thumbnails, previews, tiles, and manifests.

## Phase 2: Xcode Scaffold

- [ ] Create a SwiftUI iOS app in `ios/TasmaniaAerialExplorer`.
- [ ] Add app tabs: Search, Map, Timeline, Favorites.
- [ ] Add basic design tokens: colors, typography, spacing, corner radius, elevation.
- [ ] Add domain models: `Photo`, `Layer`, `PhotoBounds`, `SearchQuery`, `TileManifest`.
- [ ] Add API client with `URLSession`, `async/await`, retries, and typed errors.
- [ ] Add environment config for dev/staging/production API base URLs.
- [ ] Add unit test target and UI test target.

## Phase 3: Search And Results

- [ ] Build search input and location result list.
- [ ] Call Cloudflare search endpoint.
- [ ] Render result cards with thumbnails and metadata.
- [ ] Add filter sheet: layer, date range, scale, sort.
- [ ] Add loading, empty, filtered-empty, and network-error states.
- [ ] Cache recent searches locally.

## Phase 4: MapKit Browser

- [ ] Show Tasmania-focused MapKit view.
- [ ] Render photo footprints as overlays.
- [ ] Render selected photo state.
- [ ] Add search-this-area action.
- [ ] Add current location and dropped-pin search.
- [ ] Add map/list synchronized selection.

## Phase 5: Image Viewer

- [ ] Implement basic preview image viewer with pan and zoom.
- [ ] Implement tile manifest loading.
- [ ] Implement viewport-based tile loading.
- [ ] Add in-memory tile cache.
- [ ] Add disk cache for recently viewed tiles.
- [ ] Add metadata drawer.
- [ ] Add favorite/share/download actions.
- [ ] Keep direct TIFF range endpoint available behind an advanced/debug flag.

## Phase 6: Favorites And History

- [ ] Store favorites locally with SwiftData or SQLite.
- [ ] Store recent viewed photos.
- [ ] Add optional Cloudflare-backed sync.
- [ ] Add offline favorite thumbnails and cached viewer tiles.

## Phase 7: Timeline And Compare

- [ ] Build timeline grouping by year/decade.
- [ ] Add compare selection flow.
- [ ] Build side-by-side comparison.
- [ ] Build slider comparison if tile alignment is sufficient.
- [ ] Add modern imagery comparison endpoint if needed.

## Phase 8: TestFlight Readiness

- [ ] Add app icon and launch screen.
- [ ] Add privacy manifest and permission strings.
- [ ] Add crash/logging strategy.
- [ ] Run accessibility pass.
- [ ] Run poor-network and offline tests.
- [ ] Prepare App Store Connect metadata.
- [ ] Upload first TestFlight build.

## Risks

- Native TIFF decoding may become expensive if the app bypasses Cloudflare tiles.
- MapKit overlay performance must be tested with realistic footprint counts.
- Source TIFFs must be tiled/pyramidal or converted into a tile pyramid for smooth mobile viewing.
- App Review may scrutinize background location or download/offline behavior if implemented later.

## Recommended First Milestone

Ship an internal prototype that can:

1. Open to a MapKit Tasmania map.
2. Search a location through Cloudflare.
3. Show photo footprints and result cards.
4. Open a photo preview.
5. Load a tile manifest and pan/zoom generated tiles.
6. Save a local favorite.

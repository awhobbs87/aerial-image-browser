# iOS Agent Guidelines -- Tasmania Aerial Explorer Native App

## Self-Maintaining Instructions

This file is the source of truth for AI agents working specifically on the native iOS app in `ios/`.

Every iOS-focused session must begin by reading:

1. `/Users/awhob/dev/tas-aerial-explorer/AGENTS.md`
2. `/Users/awhob/dev/tas-aerial-explorer/ios/AGENTS.md`
3. The relevant iOS planning docs in this folder.

Every iOS-focused session must end by updating this file with progress, discoveries, decisions, blockers, and next steps.

### Rules For iOS Agents

1. Read this file before making iOS changes.
2. Keep the native app independent from the web UI.
3. Use the existing Astro/React app only as reference for backend behavior, Cloudflare architecture, ArcGIS integration, TIFF handling, caching, data models, and edge cases.
4. Do not port or visually translate the web app UI, Tailwind styling, navigation, cards, landing page, or browser interactions.
5. Follow Apple Human Interface Guidelines and current iOS platform conventions.
6. Prefer native SwiftUI and system components before custom controls.
7. Use Liquid Glass for controls/navigation layers, not as a general decorative content background.
8. Record new architectural decisions in the Decisions Log.
9. Add new tasks to the Progress Tracker as they emerge.
10. Keep this file append-only for history sections. Do not delete prior decisions or session notes.

---

## Product Direction

Tasmania Aerial Explorer for iOS is a fresh native app for browsing historical aerial imagery across Tasmania.

The app should feel like a modern iOS field-browsing tool:

- map-first;
- fast on mobile networks;
- optimized for one-handed iPhone use;
- respectful of iOS accessibility settings;
- visually native, not web-derived;
- backed by Cloudflare APIs that hide ArcGIS and TIFF complexity.

## Native Stack

| Layer | Technology | Direction |
| --- | --- | --- |
| App framework | SwiftUI | Primary UI framework |
| Navigation | `TabView`, `NavigationStack`, sheets | Native app structure |
| Map | Apple MapKit | First implementation |
| Image viewer | Custom SwiftUI/native tile viewer | Consume Cloudflare tile manifests and tiles |
| API | `URLSession` + Swift Concurrency | Typed clients with `async/await` |
| Persistence | SwiftData or SQLite | Decide after first prototype |
| Icons | SF Symbols | Prefer system symbols |
| Styling | Apple HIG + Liquid Glass | System materials, semantic colors |
| Backend | Cloudflare Workers/R2/KV/D1/Cache | Versioned `/api/v1` app API |

## Design Principles

- Launch into app utility, not a marketing landing page.
- Prefer full-screen map/content with native controls floating above it.
- Use detented sheets for search, filters, selected photo details, and metadata.
- Keep map and imagery visually dominant.
- Keep controls legible over aerial/satellite imagery.
- Support light mode, dark mode, Dynamic Type, Reduce Motion, Increase Contrast, and Reduce Transparency.
- Use haptics only for meaningful feedback: selection, save, snap, or completed action.
- Avoid custom visual systems unless the platform lacks a suitable native pattern.

## Liquid Glass Guidance

Liquid Glass belongs in the functional layer:

- tab bars;
- navigation bars;
- toolbars;
- floating controls;
- transient controls;
- controls over imagery/map content.

Do not use Liquid Glass for ordinary content containers like result rows, metadata blocks, timeline items, or saved-photo lists. Use standard system backgrounds and materials for content hierarchy.

Reference:

- Apple Liquid Glass: https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- Apple HIG Materials: https://developer.apple.com/design/human-interface-guidelines/materials

## Backend And TIFF Direction

Cloudflare is the app boundary.

The iOS app should consume stable `/api/v1` endpoints and should not call ArcGIS directly.

Preferred viewer delivery model:

```text
iOS tile viewer
  -> /api/v1/photos/{photoId}/tile-manifest
  -> /api/v1/photos/{photoId}/tiles/{z}/{x}/{y}.webp
```

Compatibility/debug delivery model:

```text
iOS/native or WKWebView TIFF viewer
  -> /api/v1/photos/{photoId}/tiff
  -> HTTP Range: bytes=...
```

Cloudflare can transport and cache byte ranges, but the client or tiling service must understand TIFF/GeoTIFF layout. For mobile performance, favor Worker/external-service generated tile pyramids over native decoding of arbitrary large TIFFs.

---

## Folder Plan

```text
ios/
|-- AGENTS.md
|-- README.md
|-- PROJECT_PLAN.md
|-- SCAFFOLDING.md
|-- API_CONTRACT.md
|-- UI_DESIGN.md
|-- TasmaniaAerialExplorer/          # Future Xcode project root
```

Expected app source layout after Xcode project creation:

```text
TasmaniaAerialExplorer/
|-- App/
|-- DesignSystem/
|-- Domain/
|-- Infrastructure/
|-- Features/
|-- Resources/
```

---

## Progress Tracker

### Phase 0: Planning And Direction

- [x] Create iOS planning folder -- 2026-05-24
- [x] Add iOS project plan -- 2026-05-24
- [x] Add iOS scaffolding guide -- 2026-05-24
- [x] Add native API contract draft -- 2026-05-24
- [x] Add native UI direction and Liquid Glass guidance -- 2026-05-24
- [x] Add iOS-specific self-maintaining `AGENTS.md` -- 2026-05-24
- [x] Decide minimum iOS target: iOS 18.0 for the initial prototype -- 2026-05-24
- [x] Decide initial app name and bundle identifier: `Tasmania Aerial Explorer`, `uk.awhq.TasmaniaAerialExplorer` -- 2026-05-24
- [ ] Decide first-release business model
- [ ] Decide first viewer strategy: generated tiles, direct TIFF range, or WKWebView bridge

### Phase 1: Xcode Scaffold

- [x] Create SwiftUI project in `ios/TasmaniaAerialExplorer` via XcodeGen -- 2026-05-24
- [x] Add root `TabView` -- 2026-05-24
- [x] Add `NavigationStack` per tab -- 2026-05-24
- [x] Add Map, Search, Timeline, and Saved tabs -- 2026-05-24
- [x] Add basic app environment/config -- 2026-05-24
- [x] Add dev/staging/production API base URL config -- 2026-05-24
- [x] Add unit test target -- 2026-05-24
- [x] Add UI test target -- 2026-05-24
- [x] Remove UI test runner from the default app scheme test action after simulator runner crash dialog -- 2026-05-24

### Phase 2: API Client

- [x] Define `APIClient` -- 2026-05-24
- [x] Define typed API errors -- 2026-05-24
- [x] Define response envelope types -- 2026-05-24
- [x] Add `/api/v1/health` call -- 2026-05-24
- [x] Add layer/photo/search domain models -- 2026-05-24
- [x] Add `/api/v1/layers` call -- 2026-05-24
- [x] Add `/api/v1/search/location` call -- 2026-05-24
- [ ] Add mock API responses for previews/tests

### Phase 3: Native Map Prototype

- [x] Show Tasmania-focused MapKit view -- 2026-05-24
- [x] Add map controls using native toolbar/floating-control patterns -- 2026-05-24
- [x] Add selected coordinate state -- 2026-05-24
- [x] Add search-this-area placeholder -- 2026-05-24
- [x] Add bottom sheet shell for search/results -- 2026-05-24
- [x] Wire Map tab search-this-area action to `/api/v1/search/location` -- 2026-05-24
- [x] Render native search result markers on MapKit -- 2026-05-24
- [x] Add compact native map result chips and photo detail sheet -- 2026-05-24
- [x] Replace top MapKit controls with safe-area-aware native floating controls -- 2026-05-24
- [x] Add preview image loading to the native photo detail sheet -- 2026-05-24
- [x] Restore smaller individual map control buttons while keeping Dynamic Island/status clearance -- 2026-05-24
- [x] Set tapped map locations as the explicit search center -- 2026-05-24
- [x] Move map controls to direct top-right overlay under the status icons -- 2026-05-24
- [x] Restyle the search-this-area panel with stronger Liquid Glass/material hierarchy -- 2026-05-24
- [x] Fix Search action to query the tapped marker coordinate instead of the camera center -- 2026-05-24
- [x] Zoom into the selected pinned area after Search completes -- 2026-05-24
- [x] Request current location on map launch and zoom to the user location when available -- 2026-05-25
- [x] Add user-location recenter behavior to the top map location button -- 2026-05-25
- [x] Add user-facing local API unavailable message for simulator connection failures -- 2026-05-25

### Phase 4: Viewer Prototype

- [x] Define `TileManifest` model -- 2026-05-24
- [x] Add first `/api/v1/photos/{photoId}/tile-manifest` endpoint -- 2026-05-24
- [x] Add `/api/v1/photos/{photoId}/tiff` HTTP Range endpoint -- 2026-05-24
- [x] Add iOS `APIClient.tileManifest(for:)` manifest loader -- 2026-05-24
- [x] Wire manifest loading into the first viewer screen -- 2026-05-24
- [x] Render static preview image -- 2026-05-24
- [x] Add `/api/v1/photos/{photoId}/tiles/{z}/{x}/{y}.webp` route that serves generated WebP tiles from R2 -- 2026-05-24
- [x] Add generated tile-manifest lookup from R2 with range-manifest fallback -- 2026-05-24
- [x] Add basic pan/zoom gestures to the first tile-capable surface -- 2026-05-24
- [x] Add Cloudflare API delegation boundary to the TIFF conversion service for native WebP tile manifests and tiles -- 2026-05-24
- [x] Version native R2 tile cache keys under `tiles/v1` and `tile-manifests/v1` -- 2026-05-24
- [x] Add first dedicated TIFF tile service with `geotiff` range reads and `sharp` WebP encoding -- 2026-05-24
- [x] Verify Worker-to-tile-service manifest and tile generation path locally -- 2026-05-24
- [x] Add Cloudflare Container Worker wrapper and Dockerfile for the TIFF tile service -- 2026-05-25
- [x] Add app Worker `TIFF_TILE_SERVICE` service binding with local URL fallback -- 2026-05-25
- [x] Add Cloudflare deployment guide for native API and tile generation -- 2026-05-25
- [x] Disable `workers_dev` and preview URLs for the app Worker and TIFF tile Worker, with observability enabled on both -- 2026-05-25
- [x] Verify app Worker and TIFF tile Worker dry-run deploys after disabling public dev/preview URLs -- 2026-05-25
- [x] Deploy hardened app Worker and TIFF tile Worker configs to Cloudflare -- 2026-05-25
- [x] Add dedicated `aerial-api.awhq.uk/*` Worker route with `/v1/*` native API aliases -- 2026-06-01
- [x] Wire iOS API client to the dedicated API host and Cloudflare Access service-token headers through ignored xcconfig secrets -- 2026-06-01
- [x] Add native `/v1/photos/{photoId}/preview` and `/thumbnail` endpoints so iOS media stays inside the API Access app -- 2026-06-01
- [x] Render visible manifest tiles in the iOS viewer instead of one placeholder tile -- 2026-05-24
- [x] Add native in-memory tile cache -- 2026-05-24
- [ ] Add disk tile cache for recently viewed images

---

## Decisions Log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-05-24 | Use the web app only as backend/architecture reference for iOS | Prevents a web UI port and keeps the app aligned with native iOS patterns |
| 2026-05-24 | Start with Apple MapKit | Lowest-friction native map, no separate map billing, SwiftUI-friendly |
| 2026-05-24 | Prefer Cloudflare-generated image tiles for the native viewer | Gives the best mobile performance and avoids requiring native arbitrary TIFF decoding |
| 2026-05-24 | Use Liquid Glass only for controls/navigation layers | Matches Apple HIG guidance and keeps content hierarchy legible |
| 2026-05-24 | Use XcodeGen for the initial iOS project scaffold | Keeps project generation repeatable and avoids hand-editing `project.pbxproj` |
| 2026-05-24 | Do not encode native WebP TIFF tiles directly in the Worker route | `geotiff.js` can inspect source TIFFs through byte ranges, but `OffscreenCanvas` is unavailable in local workerd and is the wrong dependency for production tile encoding |
| 2026-05-24 | Put native tile generation behind `TIFF_CONVERSION_SERVICE_URL` and cache results in R2 | Preserves the existing TIFF-aware conversion architecture while keeping the iOS API contract stable and mobile-friendly |
| 2026-05-24 | Set initial deployment target to iOS 18.0 | Provides a modern SwiftUI/MapKit baseline while keeping room to adopt newer Liquid Glass behavior through current SDK builds |
| 2026-05-24 | Add native `/api/v1` as a wrapper layer over existing backend services | Lets the iOS app consume stable app-shaped JSON without duplicating ArcGIS behavior or changing web endpoints |
| 2026-05-24 | Resolve native TIFF bytes through ArcGIS `DOWNLOAD_LINK` before falling back to constructed film scan URLs | LIST ortho/digital records do not all follow the `LandTasFilms/{film}/Scans/{image}.tif` path pattern |
| 2026-05-24 | Do not use Cloudflare Image Resizing as a TIFF tile generator | Image Resizing does not convert source TIFFs into viewport tiles; generated WebP tiles must come from TIFF-aware decoding/generation |
| 2026-05-24 | Reuse the GeoTIFFTileSource/geotiff.js approach conceptually for TIFF byte-range tile extraction | The existing web viewer proves range-aware TIFF reads; the native API should move that TIFF-aware work behind Cloudflare-generated tiles instead of asking SwiftUI to decode arbitrary TIFFs |
| 2026-05-24 | Implement the first tile generator as a Node service using `geotiff` and `sharp` | Node gives a reliable WebP encoder today while preserving the range-aware TIFF read approach; this can be deployed as the existing conversion service or promoted to a Cloudflare Container |
| 2026-05-25 | Auto-focus MapKit on the user's current location when permission is granted | Matches expected maps-app behavior and makes the search center immediately relevant on launch |
| 2026-05-25 | Deploy the TIFF tile generator as a separate Cloudflare Container-backed Worker and bind it to the app Worker | Keeps the public iOS API in the Astro Worker while putting native image-processing dependencies in the runtime designed for containers |
| 2026-05-25 | Disable `workers_dev` and preview URLs for both new Workers | The app Worker should only be reachable on the production custom route, and the TIFF tile Worker should only be reachable through the Worker service binding; observability remains enabled for both |
| 2026-06-01 | Use `aerial-api.awhq.uk/v1/*` with Cloudflare Access service-token auth for the native app | Separates browser/WARP policy from native API policy while keeping the tile Worker private behind the app Worker binding |

---

## Session Notes

### Session 1 -- 2026-05-24

- Created iOS-specific `AGENTS.md`.
- Established native app rules:
  - existing web app is backend/architecture reference only;
  - fresh SwiftUI UI;
  - Apple HIG and Liquid Glass guidance;
  - MapKit first;
  - Cloudflare `/api/v1` as backend boundary;
  - generated tile manifests/tiles preferred for mobile image viewing.

### Session 2 -- 2026-05-24

- Created the first native SwiftUI scaffold under `ios/TasmaniaAerialExplorer`.
- Added XcodeGen `project.yml` and generated `TasmaniaAerialExplorer.xcodeproj`.
- Added app shell:
  - `TabView` with Map, Search, Timeline, and Saved tabs;
  - `NavigationStack` per tab;
  - MapKit Tasmania map prototype with native controls and a material bottom search/results preview.
- Added core domain models: `Layer`, `Photo`, `SearchQuery`, and `TileManifest`.
- Added `APIClient`, response envelope types, typed API errors, and a `/api/v1/health` call.
- Added unit and UI test targets with basic smoke tests.
- Added root `.gitignore` entries for Xcode user state and DerivedData.
- Normalized the app build product name to `TasmaniaAerialExplorer` while keeping the display name in `Info.plist`, so unit test host resolution works reliably.
- Verification:
  - `xcodegen generate` succeeded.
  - Swift app sources type-check with `swiftc -typecheck -target arm64-apple-ios18.0`.
  - Full simulator build succeeds on iPhone 17 / iOS 26.5.
  - `xcodebuild test` succeeds on iPhone 17 / iOS 26.5: 2 Swift Testing unit tests and 1 XCTest UI smoke test pass.

### Session 3 -- 2026-05-24

- Added native-facing Cloudflare/Astro endpoints:
  - `GET /api/v1/health`;
  - `GET /api/v1/layers`;
  - `GET /api/v1/search/location`.
- Added `src/lib/native-api.ts` for versioned response envelopes, errors, native layer/photo mapping, and native query helpers.
- Updated the iOS `APIClient` with `layers()` and `searchLocation(lat:lng:layers:)`.
- Updated the iOS Search tab to:
  - load native layer metadata;
  - run a Huonville location search against `/api/v1/search/location`;
  - show the first 20 native photo results in native list rows.
- Smoke-tested local endpoints through `npm run dev`:
  - `/api/v1/health` returned `status: ok`;
  - `/api/v1/layers` returned the three LIST layers;
  - Huonville native search returned 268 photos.
- Verification:
  - `npm run type-check` passed.
  - `npm run build` passed.
  - `xcodegen generate` passed.
  - `xcodebuild test` passed on iPhone 17 / iOS 26.5.

### Session 4 -- 2026-05-24

- Continued the native map/data loop.
- Updated `AppRootView` to pass the shared development `APIClient` into the Map tab.
- Updated `ExplorerMapView` so the Map tab can:
  - track the visible MapKit region center;
  - run “Search this area” against `/api/v1/search/location`;
  - render up to 80 native photo markers on MapKit;
  - show a compact horizontal strip of result chips in the bottom material panel;
  - open a native detented photo detail sheet from a marker or result chip.
- Verification:
  - `xcodegen generate` passed.
  - `xcodebuild build` passed on iPhone 17 / iOS 26.5.
  - First `xcodebuild test` attempt hit a transient CoreSimulator invalid device state / Mach server died error.
  - After `xcrun simctl shutdown all`, `xcodebuild test` passed on iPhone 17 / iOS 26.5.

### Session 5 -- 2026-05-24

- User reported the app appeared letterboxed with black top/bottom margins in the simulator.
- Root cause: XcodeGen regenerated `Info.plist` without the launch/fullscreen keys, and the app had no real launch screen resource.
- Added `LaunchScreen.storyboard` and moved launch/display settings into `project.yml` so they survive regeneration:
  - `CFBundleDisplayName`;
  - `UILaunchStoryboardName`;
  - `UIRequiresFullScreen`;
  - supported orientations.
- Verified generated `Info.plist` now includes `UILaunchStoryboardName`.
- Verification:
  - `xcodegen generate` passed.
  - `xcodebuild build` passed on iPhone 17 / iOS 26.5.
  - `xcodebuild test` passed on iPhone 17 / iOS 26.5.

### Session 6 -- 2026-05-24

- User reported the top-right map controls were too high and sitting under the battery/status area after the fullscreen launch fix.
- Replaced MapKit's default top controls with a custom safe-area-aware SwiftUI floating control stack, then refined it after user feedback:
  - smaller individual 44pt material circle buttons;
  - top padding derived from the device safe-area inset plus extra clearance for Dynamic Island/status symbols.
- Added preview image loading to the native photo detail sheet using `AsyncImage`.
- Fixed the large preview failure state to render as a compact row instead of a dominant unavailable panel.
- Updated MapKit interaction so tapping an empty map location sets the orange search-center marker; panning no longer silently moves the search center.
- Fixed the Search action to call `/api/v1/search/location` with the selected marker coordinate rather than the visible camera center.
- Moved the map controls from the geometry-based overlay to a direct top-trailing overlay so the buttons remain at the top right under the status icons.
- Reworked the search-this-area panel with:
  - ultra-thin material background;
  - glass stroke/shadow;
  - a dedicated header row with coordinate readout;
  - a custom prominent glass-style Search button;
  - material result chips.
- Added native viewer/backend foundation:
  - `GET /api/v1/photos/{photoId}/tile-manifest` returns the first range-backed manifest shell;
  - `GET /api/v1/photos/{photoId}/tiff` forwards HTTP Range requests and exposes `Content-Range`, `Content-Length`, and `Accept-Ranges`;
  - TIFF origin resolution now queries ArcGIS `DOWNLOAD_LINK` first and falls back to the constructed scan URL only when needed.
- Verification:
  - `xcodegen generate` passed.
  - `xcodebuild build` passed on iPhone 17 / iOS 26.5.
  - Clean simulator retry of `xcodebuild test` passed on iPhone 17 / iOS 26.5.
  - `npm run type-check` passed.
  - `npm run build` passed.
  - Local smoke test for `Range: bytes=0-15` on a Huonville TIFF returned `206 Partial Content`.
- Follow-up verification:
  - The exact screenshot preview URL `/api/images/image/2/Hobart_25cm_2019_5275252` returned `200 OK` as JPEG after the image lookup was relaxed to match `IMAGE_NAME` with or without `.tif`.
  - `xcodebuild test` passed again on iPhone 17 / iOS 26.5 after the smaller controls and map tap changes.
  - `xcodebuild build` and `xcodebuild test` passed again after the direct top-right controls, selected-coordinate search fix, and search panel restyle.

### Session 7 -- 2026-05-24

- User showed a macOS crash dialog for `TasmaniaAerialExplorerUITests-Runner`.
- Root cause: the default `TasmaniaAerialExplorer` scheme included the UI test bundle, so routine `xcodebuild test` runs launched the generated UI-test runner helper app.
- Removed `TasmaniaAerialExplorerUITests` from the default app scheme's `testTargets` in `project.yml`; the UI test target remains in the project, but the default scheme now runs only unit tests.
- Verification:
  - `xcodegen generate` passed.
  - `xcodebuild test -scheme TasmaniaAerialExplorer` passed and only built/launched the main app plus `TasmaniaAerialExplorerTests`.

### Session 8 -- 2026-05-24

- User requested that Search this area zoom into the searched area after dropping a pin.
- Updated `ExplorerMapView.searchSelectedCoordinate()` so successful searches animate the MapKit camera to a tighter region centered on the selected pin.
- Continued the overall viewer plan by adding `APIClient.tileManifest(for:)`, which loads a photo's `/api/v1/photos/{photoId}/tile-manifest` URL through the existing envelope decoder.
- Verification:
  - `xcodegen generate` passed.
  - `xcodebuild build` passed on iPhone 17 / iOS 26.5.
  - `xcodebuild test -scheme TasmaniaAerialExplorer` passed with the default unit-test-only scheme.

### Session 9 -- 2026-05-24

- Continued Phase 4 viewer work.
- Added `PhotoViewerView`, a fresh native SwiftUI viewer screen that:
  - loads the Cloudflare tile manifest for the selected photo;
  - renders the existing native preview as the first image surface;
  - shows a Liquid Glass-style manifest status panel over the imagery;
  - handles range-backed manifest shells with no generated tile levels yet.
- Added an `Open viewer` navigation action to the map photo detail sheet.
- Verification:
  - `xcodegen generate` passed.
  - `xcodebuild build` passed on iPhone 17 / iOS 26.5.
  - `xcodebuild test -scheme TasmaniaAerialExplorer` passed with the default unit-test-only scheme.

### Session 10 -- 2026-05-24

- Added the first native tile endpoint:
  - `GET /api/v1/photos/{photoId}/tiles/{z}/{x}/{y}.webp`;
  - R2 tile cache keys under `tiles/{layerId}/{imageName}/{z}/{x}/{y}.webp`;
  - validated non-negative z/x/y tile coordinates;
  - returns cached generated tiles when present;
  - returns `TILE_NOT_GENERATED` when a requested WebP tile is not present in R2.
- Added generated tile-manifest lookup from R2 at `tile-manifests/{layerId}/{imageName}.json`; absent generated manifests now fall back to a range-only manifest with no tile levels.
- Corrected an earlier false assumption: Cloudflare Image Resizing is not the TIFF conversion/tile-generation path. The source TIFF must be decoded by a TIFF-aware generator, reusing the existing GeoTIFFTileSource/geotiff.js approach conceptually or via a dedicated service.
- Updated `PhotoViewerView` to render manifest tile URLs when generated levels exist, with basic drag and pinch zoom gestures; otherwise it remains on the preview surface.
- Verification:
  - `npm run type-check` passed.
  - `npm run build` passed.
  - `xcodegen generate` passed.
  - `xcodebuild build` passed on iPhone 17 / iOS 26.5.
  - `xcodebuild test -scheme TasmaniaAerialExplorer` passed with the default unit-test-only scheme.

### Session 11 -- 2026-05-24

- Corrected the native tile backend direction after confirming the current image-resizing path does not support TIFF conversion.
- Removed the attempted Worker-side WebP tile encoding path that depended on `OffscreenCanvas`; local workerd does not provide it.
- Added a service delegation layer for native tiles:
  - `POST {TIFF_CONVERSION_SERVICE_URL}/tiles/manifest` for TIFF-aware WebP pyramid manifests;
  - `POST {TIFF_CONVERSION_SERVICE_URL}/tiles/generate` for individual WebP tile bytes.
- The Worker API now only advertises generated WebP levels when that service supplies a valid manifest; otherwise the iOS viewer receives a range-backed manifest with TIFF dimensions and no generated tile levels.
- Versioned native R2 tile and manifest keys under `tiles/v1/...` and `tile-manifests/v1/...` so stale experimental generated manifests are not reused.
- Local smoke test:
  - `GET /api/v1/photos/2:Hobart_25cm_2019_5275252/tile-manifest` returned `format: tiff-range`, `width: 4000`, `height: 4000`, and no levels when the service did not generate a pyramid.
  - `GET /api/v1/photos/2:Hobart_25cm_2019_5275252/tiles/0/0/0.webp` returned `503 TILE_NOT_GENERATED` instead of attempting in-process TIFF conversion.
- Verification:
  - `npm run build` passed.
  - A standalone `npm run type-check` passed after an initial parallel run collided with the build inspector port.

### Session 12 -- 2026-05-24

- Implemented the first end-to-end native tile generation path.
- Added `services/tiff-tile-service`, a Node 22 service with:
  - `GET /health`;
  - `POST /tiles/manifest`;
  - `POST /tiles/generate`;
  - `geotiff` range-aware TIFF reads;
  - `sharp` WebP encoding for 512px tiles.
- Added root helper scripts:
  - `npm run dev:tiff-tiles`;
  - `npm run start:tiff-tiles`.
- Updated `.dev.vars.example` with the local tile service URL hint.
- Verified the Worker-to-service-to-R2 path locally:
  - `GET /api/v1/photos/2:Hobart_25cm_2019_5275252/tile-manifest` returned a WebP manifest with `4000x4000` dimensions and 3 pyramid levels.
  - `GET /api/v1/photos/2:Hobart_25cm_2019_5275252/tiles/2/0/0.webp` generated a valid 512x512 WebP tile and stored it.
  - Repeating the same tile request returned `X-Cache: HIT`.
- Replaced the iOS viewer's single-tile prototype with viewport-aware tile rendering:
  - chooses a manifest level;
  - computes the visible tile range from pan/zoom state and viewport size;
  - loads only visible plus adjacent-margin tiles;
  - keeps the preview behind tiles as a low-cost placeholder.
- Added `TileImageMemoryCache`, `TileImageLoader`, and `CachedTileImage` for in-memory native tile caching.
- Fixed generated test bundle Info.plist settings in XcodeGen so `xcodebuild test` works with the regenerated project.
- Verification:
  - `node --check services/tiff-tile-service/src/server.js` passed.
  - `npm run lint` passed.
  - `npm run type-check` passed.
  - `npm run build` passed.
  - `xcodegen generate` passed.
  - `xcodebuild build` passed on iPhone 17 / iOS 26.5.
  - `xcodebuild test -scheme TasmaniaAerialExplorer` passed on iPhone 17 / iOS 26.5.

### Session 13 -- 2026-05-25

- User asked for app launch to behave like Google Maps by showing the current location zoomed in.
- Added `UserLocationProvider`, a `CLLocationManager` wrapper that:
  - requests When In Use authorization;
  - publishes the user's current coordinate;
  - keeps Swift 6 actor isolation around CoreLocation delegates explicit.
- Updated `ExplorerMapView`:
  - adds `UserAnnotation()` so MapKit shows the native user-location dot;
  - requests location when the map appears;
  - automatically zooms to the first user coordinate with a tight region;
  - sets the search center to the user coordinate;
  - changes the top location button to recenter on the user instead of resetting to Tasmania.
- Added `NSLocationWhenInUseUsageDescription` through XcodeGen.
- Replaced raw local `localhost:4321` networking failures with a clearer API error: `Local API unavailable. Start npm run dev from the repo root, then try again.`
- Notes on observed console output:
  - `Connection refused` is expected when the local Astro API is not running on port 4321.
  - `CAMetalLayer ignoring invalid setDrawableSize width=0 height=0`, `clip: empty path`, and CA launch metric messages still appear during simulator/test runs and are MapKit/CoreAnimation simulator noise, not app-level failures.
- Verification:
  - `xcodegen generate` passed.
  - `npm run lint` passed.
  - `npm run type-check` passed.
  - `npm run build` passed.
  - `xcodebuild build` passed on iPhone 17 / iOS 26.5.
  - `xcodebuild test -scheme TasmaniaAerialExplorer` passed on iPhone 17 / iOS 26.5.

### Session 14 -- 2026-05-25

- User asked to move the dev architecture to Cloudflare so the app can run without localhost.
- Added Cloudflare Container deployment support for `services/tiff-tile-service`:
  - `Dockerfile`;
  - `.dockerignore`;
  - `src/container-worker.js`;
  - `wrangler.jsonc`;
  - `@cloudflare/containers` dependency.
- Added root deployment scripts:
  - `npm run deploy:tiff-tiles`;
  - `npm run deploy:tiff-tiles:dry-run`;
  - `npm run deploy:cloudflare`.
- Added root app Worker service binding:
  - `TIFF_TILE_SERVICE -> tas-aerial-tiff-tiles`.
- Updated native tile service client code:
  - uses local `TIFF_CONVERSION_SERVICE_URL` first when it points to `localhost` or `127.0.0.1`;
  - otherwise uses the Cloudflare `TIFF_TILE_SERVICE` binding;
  - still supports an external URL fallback.
- Added `ios/CLOUDFLARE_DEPLOYMENT.md` with deployment order and smoke tests.
- Updated `ios/API_CONTRACT.md` with the Cloudflare runtime details.
- Verification:
  - `node --check services/tiff-tile-service/src/container-worker.js` passed.
  - `node --check services/tiff-tile-service/src/server.js` passed.
  - `npm run lint` passed.
  - `npm run type-check` passed.
  - `npm run build` passed.
  - `npx wrangler deploy --dry-run` for the app Worker passed and showed the `TIFF_TILE_SERVICE` binding.
  - `npm run deploy:tiff-tiles:dry-run` bundled the Worker but stopped at container image build because Docker CLI/daemon is not running locally.

### Session 15 -- 2026-05-25

- User asked to turn off preview URLs and dev URLs for the new Workers and enable observability.
- Started Colima as the local Docker-compatible daemon and installed/configured Docker buildx so Wrangler can build Cloudflare Container images locally.
- Fixed the TIFF tile service compatibility date after Cloudflare rejected a future date.
- Updated both Worker configs:
  - `workers_dev: false`;
  - `preview_urls: false`;
  - `observability.enabled: true`.
- Verification:
  - `npm run deploy:tiff-tiles:dry-run` passed.
  - `npm run build && npx wrangler deploy --dry-run` passed.
- Deployment:
  - `npm run deploy:tiff-tiles` deployed `tas-aerial-tiff-tiles`; Cloudflare reported current version `369f390f-6f9c-4a76-81ca-22e416deb8ae`.
  - `npm run deploy` deployed `tas-aerial-browser` to `aerial-explorer.awhq.uk/*`; Cloudflare reported current version `f7658256-e4c5-40ff-a59f-705c1315031e`.
  - Production curl smoke tests reached Cloudflare but returned `Please authenticate via the warp client`, so unauthenticated JSON verification is blocked by the current Access/WARP policy.
  - Retried production smoke tests for `/api/v1/health`, `/api/v1/layers`, and `/api/v1/search/location`; all still return the WARP authentication message before reaching the Worker.

### Session 16 -- 2026-06-01

- User chose a dedicated native API host protected by a Cloudflare Access service-token policy.
- Added `aerial-api.awhq.uk/*` to the app Worker routes.
- Added `/v1/*` aliases for native API endpoints, including:
  - `/v1/health`;
  - `/v1/layers`;
  - `/v1/search/location`;
  - `/v1/photos/{photoId}/tile-manifest`;
  - `/v1/photos/{photoId}/tiles/{z}/{x}/{y}.webp`;
  - `/v1/photos/{photoId}/tiff`;
  - `/v1/photos/{photoId}/preview`;
  - `/v1/photos/{photoId}/thumbnail`.
- Updated native API link generation so `/v1` requests emit `/v1` tile/TIFF/preview URLs.
- Added iOS config files:
  - tracked `Config/Debug.xcconfig` and `Config/Release.xcconfig`;
  - ignored `Config/Secrets.xcconfig` and `Config/LocalOverrides.xcconfig`.
- Updated `AppEnvironment` to read API base URL and Access service-token values from `Info.plist` build settings.
- Updated `APIClient` to use `/v1` paths and send `CF-Access-Client-Id` / `CF-Access-Client-Secret` headers when configured.
- Verification:
  - `npm run type-check` passed.
  - `npm run build` passed.
  - `xcodegen generate` passed.
  - `xcodebuild build -scheme TasmaniaAerialExplorer` passed on iPhone 17.
  - `xcodebuild test -scheme TasmaniaAerialExplorer` passed on iPhone 17.
  - `npm run deploy` deployed app Worker version `070a4e45-4f82-4938-a110-eb068b3f7587`.
  - Forced-DNS smoke tests with service-token headers passed for `/v1/health`, `/v1/search/location`, `/v1/photos/{photoId}/tile-manifest`, and `/v1/photos/{photoId}/preview`.
- Remaining deployment issue:
  - `aerial-api.awhq.uk` does not resolve in public DNS yet. Add a proxied DNS record before testing from the simulator/device without forced DNS.
- Follow-up verification:
  - DNS for `aerial-api.awhq.uk` was added and normal-DNS smoke tests passed for `/v1/health`, `/v1/search/location`, `/v1/photos/{photoId}/tile-manifest`, `/v1/photos/{photoId}/preview`, and `/v1/photos/{photoId}/tiles/{z}/{x}/{y}.webp`.
  - Installed and launched the iOS simulator app built from the production API config; the app bundle contains `APIBaseURL=https://aerial-api.awhq.uk` and an Access client ID from ignored xcconfig settings.
  - Simulator launch shows the expected location permission prompt. `simctl privacy grant location` did not dismiss the active prompt, so the remaining map/search UI click-through needs manual prompt acceptance or a UI automation path once Computer Use permissions are available.

### Session 17 -- 2026-09-06

- Prepared the native iOS checkpoint for commit and push.
- Confirmed local secret-bearing config is ignored:
  - `Config/Secrets.xcconfig`;
  - `Config/LocalOverrides.xcconfig`.
- Verification:
  - `npm run lint` passed from the repo root.
  - `npm run type-check` passed from the repo root.
  - `xcodegen generate` passed in `ios/TasmaniaAerialExplorer`.
  - Generic simulator `xcodebuild build` passed for the `TasmaniaAerialExplorer` scheme.
- Current local simulator limitation:
  - `xcodebuild test` against a concrete `iPhone 17` simulator is blocked by a CoreSimulator runtime mismatch and unavailable destination on this machine.
  - Use a repaired simulator runtime or a currently installed device destination before relying on simulator test results again.

---

## Blockers And Open Questions

- Add persistent disk tile cache for recently viewed images after the in-memory cache proves stable.
- Persistence choice is not decided: SwiftData or SQLite.
- Replace the prototype embedded service-token approach before public release; long-lived service tokens in iOS app bundles are not durable secrets.
- Repair/update the local CoreSimulator runtime before running concrete simulator tests again.
- Complete manual simulator UI pass after accepting the location permission prompt, or enable Computer Use permissions for automated clicking.

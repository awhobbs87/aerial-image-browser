# API data and web UI audit

Date: 2026-11-16. Scope: current web source, including the server routes it calls. Native iOS is outside this audit. This is a source-level analysis, not a production network capture or latency benchmark. Attempts to inspect the live LIST layer schemas through the web retrieval tool failed, so additional upstream fields and field units remain unverified. The findings below describe the pre-implementation state; see the implementation update at the end.

## Actual request paths

| User action | Browser request | Server/upstream work | UI implication |
| --- | --- | --- | --- |
| Type a location | `GET /api/geocoding/search?q=…` | Cached for 24 hours; LIST SearchService address and named-feature queries | Response includes label, type, coordinates, bounding box and ranking. Suggestions mostly use the label and coordinates. |
| Select a location or map point | `GET /api/search/location?lat=…&lon=…&layers=0,1,2` | Parallel point-intersection queries against three LIST imagery layers, paginated in batches of 1,000; complete results cached for 15 minutes | Finds footprints covering a point, not all imagery throughout the named suburb or visible map. |
| Change filters | No new search request for the same location | Client filters the complete result; browser cache lasts five minutes | Counts, availability histograms and survey grouping can be computed locally. Preserve this behaviour. |
| Scroll cards | `GET /api/images/thumbnail/{layer}/{name}?variant=card-*` | Edge/R2 cache; otherwise source-link lookup, source JPEG fetch and optional Images transformation | Existing lazy responsive images and loading/error treatment should be retained. A cold thumbnail can require an extra ArcGIS query. |
| Open photo preview | Same image endpoint with `preview-1600` | Larger derived image, still based on the upstream thumbnail | Do not imply this is the original scan or that a 1,600px preset guarantees 1,600px source detail. |
| Open full viewer | Preview plus `GET /api/images/tiff-proxy/{layer}/{name}` | OpenSeadragon/GeoTIFF range access progressively upgrades the preview | Expose preview/loading/full-resolution/failure states; a failed upgrade currently mainly logs a warning. |
| Open location reference | `GET /api/images/metadata/{layer}/{name}` plus map tiles | Full feature lookup, then normalisation; metadata cached for 24 hours | Already has footprint support. Reuse this response for authoritative details on directly opened viewer URLs. |
| AI search | `POST /api/ai/parse-search`, then geocoding and normal search | Workers AI with heuristic fallback | Parsed resolution is displayed but not applied; first geocoder result is selected automatically. |
| Change map view | Direct CARTO, Stadia or Esri tile requests | External basemap providers | Keep basemap failure separate from photo-search failure. |
| Load desktop navigation | `GET /api/version` | Worker/app version metadata | Existing version badge is an appropriate use. |

Source anchors: `src/hooks/usePhotos.ts`, `src/lib/arcgis.ts`, `src/lib/photo-media.ts`, `src/lib/tasmania-geocoder.ts`, `src/components/viewer/ImageViewer.tsx`, `src/components/viewer/LocationReference.tsx`.

### Present in the repository, not connected to the current web journey

- `/api/search/bounds` and `usePhotosByBounds` exist, but the active search page calls only `usePhotos`. The separate `MapControls` search-area control is not mounted by `MapView`.
- `/api/layers` exists, but the web filters use fixed layer labels. Its raw ArcGIS metadata envelope does not match the simplified `LayersResponse` declaration in `src/types/api.ts`.
- `/api/favorites`, `/api/search-history` and `/api/me` exist, but current favourites and recent searches use localStorage. The history API wrapper has no UI callers.
- AI enhancement and summary routes exist, but the UI only calls parse-search. A result summary does not require an additional AI request.
- Conversion health, URL/upload and proxy endpoints have a hook/component, but `TiffConverter` is not mounted by the current viewer. Its fixed 30/70 meter is not measured conversion progress. Do not confuse this dormant flow with the active TIFF range viewer.
- `/compare` is currently static empty-state markup. Comparison components and the store exist without a mounted comparison flow. `PhotoCard` accepts an `onCompare` prop but does not use it. The page tells users to add photos without providing that action.
- `reverseGeocode` exists but has no current UI caller. Nominatim should not be counted as an active request just because its wrapper remains in the repository.

## Prioritised improvements

### 1. Explain what a search covers and expose useful result availability

Show “Photos covering this point” near the selected location. An address and a suburb currently both become a single coordinate, with the same fixed map zoom. Add address/locality/place type labels to suggestions and use non-degenerate geocoder bounds to frame larger places.

Keep point search as the precise default. Offer an explicit “Search visible area” action using the existing bounds endpoint, with a visible search extent and a suitable area/zoom limit. Bounding-box intersection means “overlaps this area”, not exact suburb-boundary coverage.

Retain both raw and filtered counts in the hook: `usePhotoSelection` currently replaces `count` with the filtered count. Display “Showing X of Y photos”, available year span, and counts by imagery layer. Add a compact year distribution and filter counts derived from the full cached dataset. Avoid making the histogram shrink misleadingly to only the current date selection.

### 2. Add a useful Details sheet without overloading cards

Already returned fields include `dateFlown`, `year`, `layerName`, `type`, `run`, `filmType`, `photoNo`, `altitude`, `area` and `rings`. Cards already show year, shortened project, type, scale and reference. The unused opportunity is structured details, not adding all fields to every card.

Use a mobile bottom sheet / desktop details panel with full survey name, capture date where known, imagery layer, image type, photo reference, run, film number, frame, scale, coverage map and original-download action. Add “More from this survey” and optional survey grouping based on records already loaded.

Important mapping caveat: `filmType` is populated from `FILM_NO`; label it “Film number”, not colour/film stock. `type` comes from `IMAGE_TYPE`, while `layerId` identifies aerial/ortho/digital. Do not assume altitude or area units until the upstream schema is verified. Zero defaults mean missing data and should not become “0 metres” or “0 square metres”.

Direct viewer URLs currently get their main details from query parameters. The metadata endpoint is fetched only inside the location-reference dialog. Fetch/seed authoritative metadata once per opened photo and share it with the details and location panels; do not fetch metadata for every card.

### 3. Make date and detail filters truthful

`filterPhotos` deliberately retains unknown dates and scales under active filters. Show “Include unknown dates/scales” options and counts, rather than making those records look like verified matches. Digital search fields omit `SCALE`, so digital records default to unknown and survive detail filters.

Distinguish known capture date, inferred survey year and unknown date. The server can infer a year from the project name but discards the provenance. Add a small date-source/precision field to the shared model. Do not manufacture an exact date from an inferred year.

Fix two ordering problems in `PhotoGrid`: group headers are always sorted ascending even when “Newest first” is selected; date sorting ignores inferred `year` when `dateFlown` is missing. Also clarify that current group counts reflect the displayed slice, not the full survey/decade count.

Scale describes the source photography, not guaranteed scan sharpness or ground resolution. Keep the scale value visible and explain it briefly. Do not turn an unknown scale into a “high resolution” claim.

### 4. Show image quality and recovery states

The viewer already starts with a preview and upgrades progressively. Extend its existing “Full res” badge into explicit states: Preview, Loading full resolution, Full resolution, and Preview only with Retry. Keep the preview interactive if TIFF loading fails. Add a clear original-TIFF download alongside a preview-download option if implemented.

Only show dimensions, file size or determinate progress when measured or supplied by a verified metadata contract. Current search results do not contain those values. Do not add per-card HEAD/TIFF requests to obtain them.

### 5. Repair AI search interpretation

`AISearchModal` displays `resolution` but never sets scale categories. Unspecified date/layer values can leave old filters active. It automatically takes the first geocoder result and closes the parsed-query display.

Show an editable interpretation before applying the search, especially when locations are ambiguous. Make inherited filters explicit or reset them deliberately. Map a request for detail to a clearly labelled scale preference only if that is the intended product behaviour; explain that it is not measured image resolution. `AIService` currently validates years only through 2024 and should use the supported/current date range. Return whether heuristic fallback was used if the UI is to disclose it.

### 6. Complete comparison and saved-photo journeys

Add “Compare” to the preview, show a two-photo selection tray, and mount the existing comparison components on `/compare`. Help users choose different dates covering the same point and display both surveys/dates/scales. Footprint overlap supports selection but does not establish pixel alignment.

Before enabling `ThenNow`, specify the coordinate system for its geographic bbox request and label Esri imagery as modern reference imagery with capture date unverified. The existing component calls it “Current” and provides no acquisition date. Retain the location-reference warning about distortion; never imply precise alignment of unregistered scans.

For favourites, immediately label the existing behaviour “Saved on this device”. Cross-device saving can use the existing server endpoints, but needs a shared contract, idempotent saves, migration of existing local records, and visible syncing/error/retry states. Server favourites currently return database-shaped records with JSON-encoded `photo_data`, not `EnhancedPhoto[]`.

### 7. Improve partial failure and refresh behaviour

Location/bounds routes use `Promise.all`: one failed imagery layer rejects the entire search. A backend enhancement can return successful layers plus explicit failed-layer/completeness metadata. Then show “Some imagery unavailable” and retry only failed layers; never present a partial count as complete.

The search error UI has no Retry action, unlike the timeline. Add retry and background-refresh feedback. A true refresh must bypass/invalidate the manual five-minute browser cache as well as TanStack Query, and needs defined server-cache semantics if “latest” is promised. The current search response has no freshness timestamp or per-layer status, so the UI cannot truthfully invent them.

## Supporting API and performance work

- Consolidate shared response types with actual contracts before adding UI fields. Declared `SearchResponse` includes `total`, `hasMore` and `searchTime`, while live route code emits `{ success, data: { count, photos } }`; radius/offset/limit declarations do not imply those parameters are implemented.
- Reuse trusted search metadata to populate the source-link cache where practical. Cold image delivery can otherwise repeat an ArcGIS lookup for each card even though search just fetched its source link. Measure before changing cache behaviour.
- Compute counts, date ranges, survey groups and filter availability locally. Do not call AI summary or layer metadata just to generate deterministic summaries.
- Preserve responsive images, request cancellation, lazy map/viewer imports and local filtering. Consider bounded adjacent-preview prefetch only after the active image loads; do not prefetch full TIFFs.
- Only enable bounds queries explicitly, with size guards. The current server can paginate many records and polygons before returning; fetching on every pan would increase load and perceived latency.

## Suggested delivery order

1. Correct date/group/filter semantics and AI year/interpretation behaviour; add search Retry and viewer quality states.
2. Add result availability, a Details sheet and geocoder type/extent support using existing data.
3. Connect comparison and implement explicit bounds search.
4. Add partial-layer results, metadata provenance and optional account-backed favourites/history.

Validation for implementation: fixtures spanning all three layers, missing/inferred dates and scales, direct viewer URLs, partial failures, cached refreshes, ambiguous geocoding, AI filters, and desktop/mobile details and comparison flows. The original audit was documentation-only. Implementation and validation are recorded below.

## Implementation update

Implemented the authorised scope except favourites. Search now exposes raw availability, explicit unknown metadata filters, date provenance, survey grouping/filtering, guarded area searches and geocoder type/extent. AI search requires review and an explicit location choice, applies scale preferences and resets old filters. Photo details share metadata with the location reference. Comparison is mounted with session-persisted selections, image recovery and keyboard controls. Viewer quality states and retry retain preview access.

Search APIs return successful layers plus completeness/failure information. Retry targets failed layers; explicit refresh bypasses browser and server search caches. The response-check timestamp is not an upstream freshness guarantee. TIFF proxy lookup uses the supplied download link, and source-link priming is bounded. Optional account history sync has explicit opt-in/import/retry/delete controls; favourites remain unchanged.

Validation: 255 unit/component tests and standalone TypeScript checks pass. Source lint and scoped formatting pass. Production build and browser verification remain blocked by local runtime/sandbox limits (latest build: file watcher exhaustion and denied Wrangler log write). Added browser scenarios have not run successfully. Live upstream units, actual TIFF upgrade behaviour, visual layouts and production latency require runtime verification. No deployment was performed.

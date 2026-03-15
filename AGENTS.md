# Repository Guidelines -- Tasmania Aerial Photo Explorer (Astro 6 Rewrite)

## Self-Maintaining Instructions

**This file is the single source of truth for any AI agent working on this project.** Every session must begin by reading this file and end by updating it. The development plan, progress tracker, and architectural decisions all live here.

### Rules for AI Agents

1. **Read this file first** at the start of every session. Do not begin work without understanding the current state.
2. **Update the Progress Tracker** below as you complete work. Mark items `[x]` when done, add dates, and note any deviations from the plan.
3. **Add new tasks** to the tracker as they emerge during development. Do not let work happen "off the books."
4. **Record architectural decisions** in the Decisions Log when you make a non-obvious choice (e.g. "chose X over Y because Z").
5. **Record blockers and open questions** so the next session (or a different agent) can pick up without guessing.
6. **Keep this file honest.** If something isn't working, say so. If the plan needs to change, change the plan here first, then do the work.
7. **Never delete history** from the Decisions Log or Session Notes. Append only.

---

## Project Overview

Tasmania Aerial Photo Explorer: a web application that queries Tasmania's ArcGIS REST services for historical, orthophoto, and digital aerial imagery. It proxies and caches images via Cloudflare Workers + R2/KV, and presents them with map, grid, timeline, and comparison views.

**This branch (`feat/astro6-rewrite`) is a ground-up rewrite** of the original React 19 + Vite + MUI + Hono application into a modern Astro 6 + React 19 + Mantine 8 stack.

---

## Tech Stack

| Layer             | Technology                                  | Notes                                                                    |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| Meta-framework    | Astro 6                                     | Islands architecture, file-based routing, Cloudflare adapter v13         |
| UI framework      | React 19                                    | Islands via `client:load` / `client:visible` / `client:only="react"`     |
| Component library | Mantine 8                                   | CSS Modules, built-in dark/light, hooks library, `@tabler/icons-react`   |
| Styling           | Mantine CSS Modules + PostCSS               | `postcss-preset-mantine`, `postcss-simple-vars`. No Tailwind, no Emotion |
| Map               | MapLibre GL JS                              | Vector tiles, GPU-accelerated, native mobile gestures                    |
| State management  | Zustand 5                                   | Replaces 30+ useState hooks. Persist middleware for localStorage         |
| Server state      | TanStack Query v5                           | Photo search caching, layer metadata                                     |
| API layer         | Astro native endpoints                      | Replaces Hono. `import { env } from 'cloudflare:workers'` for bindings   |
| Image viewer      | OpenSeadragon 5                             | Deep-zoom for large TIFF/WebP images                                     |
| Testing           | Vitest + React Testing Library + Playwright | Unit, component, and e2e                                                 |
| Runtime           | Cloudflare Workers (`workerd`)              | R2, KV, D1, Workers AI. Dev server runs `workerd` via Astro 6            |
| Node version      | 22 (required by Astro 6)                    | `.nvmrc` set to `22`                                                     |

---

## Project Structure

```
aerial-image-browser/
|-- AGENTS.md                         # THIS FILE - source of truth
|-- astro.config.mjs                  # Astro 6 config (Cloudflare adapter, React, fonts)
|-- wrangler.jsonc                    # Cloudflare bindings (KV, D1, R2, AI)
|-- package.json                      # Single package (no monorepo)
|-- tsconfig.json
|-- .nvmrc                            # Node 22
|-- migrations/                       # D1 schema migrations
|
|-- src/
|   |-- layouts/
|   |   |-- BaseLayout.astro          # HTML shell, ColorSchemeScript, fonts, meta
|   |   |-- AppLayout.astro           # Nav + content + map backdrop
|   |
|   |-- pages/
|   |   |-- index.astro               # Landing / search page
|   |   |-- search.astro              # Search results (map + grid/timeline)
|   |   |-- compare.astro             # Comparison view
|   |   |-- favorites.astro           # Saved favorites
|   |   |-- timeline.astro            # Timeline view
|   |   |-- viewer/
|   |   |   |-- [layerId]/
|   |   |       |-- [imageName].astro # Full image viewer
|   |   |-- api/                      # API endpoints (replace Hono)
|   |       |-- health.ts
|   |       |-- layers.ts
|   |       |-- me.ts
|   |       |-- search/
|   |       |   |-- location.ts
|   |       |   |-- bounds.ts
|   |       |-- images/
|   |       |   |-- tiff/[layerId]/[imageName].ts
|   |       |   |-- webp/[layerId]/[imageName].ts
|   |       |   |-- thumbnail/[layerId]/[imageName].ts
|   |       |   |-- image/[layerId]/[imageName].ts
|   |       |-- convert/
|   |       |   |-- tiff-url.ts
|   |       |   |-- tiff-upload.ts
|   |       |   |-- tiff-health.ts
|   |       |   |-- tiff-proxy.ts
|   |       |-- ai/
|   |       |   |-- enhance-search.ts
|   |       |   |-- parse-search.ts
|   |       |   |-- search-summary.ts
|   |       |-- favorites/
|   |       |   |-- index.ts          # GET list, POST add
|   |       |   |-- [id].ts           # DELETE remove
|   |       |-- search-history/
|   |           |-- index.ts          # GET list, POST add
|   |           |-- [itemId].ts       # DELETE remove
|   |
|   |-- components/                   # React islands
|   |   |-- search/
|   |   |   |-- SearchBar.tsx
|   |   |   |-- SearchResults.tsx
|   |   |   |-- AISearchModal.tsx
|   |   |-- map/
|   |   |   |-- MapView.tsx
|   |   |   |-- MapControls.tsx
|   |   |   |-- PhotoFootprints.tsx
|   |   |   |-- PinDrop.tsx
|   |   |-- photos/
|   |   |   |-- PhotoGrid.tsx
|   |   |   |-- PhotoCard.tsx
|   |   |   |-- PhotoTimeline.tsx
|   |   |   |-- PhotoSkeleton.tsx
|   |   |-- viewer/
|   |   |   |-- ImageViewer.tsx
|   |   |   |-- TiffConverter.tsx
|   |   |-- compare/
|   |   |   |-- CompareSlider.tsx
|   |   |   |-- CompareSideBySide.tsx
|   |   |   |-- ThenNow.tsx
|   |   |-- filters/
|   |   |   |-- FilterPanel.tsx
|   |   |   |-- FilterPresets.tsx
|   |   |   |-- MobileFilterSheet.tsx
|   |   |-- layout/
|   |   |   |-- Navigation.tsx
|   |   |   |-- MobileNav.tsx
|   |   |   |-- ThemeToggle.tsx
|   |   |-- common/
|   |       |-- ErrorBoundary.tsx
|   |       |-- LoadingOverlay.tsx
|   |       |-- BackToTop.tsx
|   |
|   |-- hooks/
|   |   |-- usePhotos.ts
|   |   |-- useTiffConversion.ts
|   |   |-- useMapSync.ts
|   |   |-- useSearchState.ts
|   |
|   |-- stores/
|   |   |-- searchStore.ts
|   |   |-- filterStore.ts
|   |   |-- comparisonStore.ts
|   |   |-- favoritesStore.ts
|   |   |-- uiStore.ts
|   |
|   |-- lib/
|   |   |-- api-client.ts            # Fetch-based (no Axios)
|   |   |-- arcgis.ts                # ArcGIS REST client (ported from old src/lib/)
|   |   |-- cache.ts                 # KV cache manager
|   |   |-- r2.ts                    # R2 storage manager
|   |   |-- image-conversion.ts      # TIFF-to-WebP (utif2 + OffscreenCanvas)
|   |   |-- ai.ts                    # Workers AI service
|   |   |-- auth.ts                  # CF Access JWT extraction
|   |   |-- geocoding.ts             # Nominatim geocoding service
|   |   |-- search-history.ts        # History manager
|   |   |-- format.ts                # Coordinate/date formatters
|   |
|   |-- styles/
|   |   |-- theme.ts                 # Mantine theme (single source of truth)
|   |   |-- global.css               # Minimal global resets
|   |   |-- glass.module.css         # Glassmorphic panel styles
|   |   |-- map.module.css           # Map-specific styles
|   |
|   |-- types/
|   |   |-- api.ts                   # API request/response types
|   |   |-- photo.ts                 # PhotoAttributes, EnhancedPhoto
|   |   |-- map.ts                   # Map-related types
|   |   |-- env.d.ts                 # Cloudflare bindings type augmentation
|   |
|   |-- workers/
|       |-- tiff-conversion.worker.ts
|
|-- tests/
|   |-- unit/                        # Vitest unit tests
|   |-- integration/                 # API integration tests
|   |-- e2e/                         # Playwright (mobile + desktop viewports)
|
|-- public/
|   |-- manifest.json                # PWA manifest
|   |-- icon-192.png
|   |-- icon-512.png
|   |-- icon.svg
```

---

## Build, Test, and Development Commands

| Command                    | What it does                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `npm run dev`              | Start Astro dev server (runs `workerd` via Cloudflare adapter -- bindings work locally) |
| `npm run build`            | Build for production                                                                    |
| `npm run preview`          | Preview production build locally (also runs `workerd`)                                  |
| `npm run deploy`           | Build + deploy to Cloudflare Workers                                                    |
| `npm run db:migrate`       | Apply D1 migrations (production)                                                        |
| `npm run db:migrate:local` | Apply D1 migrations (local dev)                                                         |
| `npm run test`             | Run all tests (unit + integration + e2e)                                                |
| `npm run test:unit`        | Vitest unit tests only                                                                  |
| `npm run test:e2e`         | Playwright e2e tests                                                                    |
| `npm run lint`             | ESLint check                                                                            |
| `npm run lint:fix`         | ESLint auto-fix                                                                         |
| `npm run type-check`       | TypeScript type checking                                                                |
| `npm run format`           | Prettier format                                                                         |

---

## Coding Style & Naming Conventions

- **TypeScript only.** No `.js` files in `src/`.
- **Prettier** with two-space indentation, enforced via Husky + lint-staged.
- **ESLint** with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh`.
- **Astro pages**: kebab-case filenames (`search.astro`, `compare.astro`).
- **React components**: PascalCase filenames (`PhotoCard.tsx`, `MapView.tsx`).
- **Hooks**: `use*` prefix, camelCase (`usePhotos.ts`, `useMapSync.ts`).
- **Stores**: camelCase with `Store` suffix (`searchStore.ts`, `filterStore.ts`).
- **Lib utilities**: kebab-case (`api-client.ts`, `image-conversion.ts`).
- **CSS Modules**: `*.module.css` co-located with components or in `src/styles/`.
- **API endpoints**: Return `Response` objects directly. Use `import { env } from 'cloudflare:workers'` for bindings.
- **No default exports** for React components (named exports only). Astro pages use default exports per Astro convention.
- **No emojis** in code, comments, or commit messages unless the user explicitly requests them.

---

## Styling Rules

- **One styling system**: Mantine CSS Modules + PostCSS. No Tailwind, no Emotion, no inline styles, no `sx` prop.
- **Theme tokens** live in `src/styles/theme.ts`. All colors, radii, spacing, and typography reference the Mantine theme.
- **Dark/light mode**: `colorScheme: 'auto'` in Mantine theme detects system preference. `ColorSchemeScript` in `<head>` prevents flash. Manual override via `useMantineColorScheme()`.
- **Glassmorphism**: Defined in `src/styles/glass.module.css` using `light-dark()` CSS function for theme-aware translucency. Applied via `className` -- never inline backdrop-filter.
- **Mobile-first**: Write mobile styles as the default. Use Mantine breakpoints (`@media (min-width: ...)`) or `useMediaQuery` to add desktop enhancements.
- **Touch targets**: Minimum 44x44px for all interactive elements (Apple HIG compliance).

---

## Mobile Optimization Rules

This app has a **heavy emphasis on mobile usability**. Every component must work excellently on phones.

1. **Bottom navigation** (tab bar) on mobile -- Search, Map, Timeline, Favorites. Always thumb-reachable.
2. **Bottom sheets** (Mantine Drawer anchored bottom) for filters, search suggestions, photo actions. Never full-screen modals on mobile.
3. **Native gestures** via MapLibre (pinch, rotate, two-finger tilt). No custom gesture implementations.
4. **No hamburger menus.** All primary navigation is always visible.
5. **Skeleton loading** on every data-dependent surface. No layout shift.
6. **Reduced motion**: Respect `prefers-reduced-motion` via Mantine's built-in transition handling.
7. **Viewport-aware rendering**: Use `useMediaQuery` from `@mantine/hooks` for conditional component trees (not CSS display:none).
8. **PWA**: Service worker caches map tiles, recent thumbnails, and app shell. Offline fallback page.

---

## Cloudflare Bindings & Secrets

| Binding                       | Type       | Resource                           | Notes                                    |
| ----------------------------- | ---------- | ---------------------------------- | ---------------------------------------- |
| `PHOTO_CACHE`                 | KV         | `6b0c54bb697d44c5b8dd97f02141bfdf` | Layer metadata cache, search history     |
| `PHOTOS_DB`                   | D1         | `tas-browser`                      | Users, favorites, search history         |
| `TIFF_STORAGE`                | R2         | `tas-aerial-browser-tiffs`         | TIFF files, WebP conversions, temp files |
| `THUMBNAIL_STORAGE`           | R2         | `tas-aerial-browser-thumbnails`    | Thumbnail JPEGs                          |
| `AI`                          | Workers AI | Llama 3 8B Instruct                | Search enhancement, NL parsing           |
| `API_BASE_URL`                | Var        | ArcGIS MapServer URL               | Set in `wrangler.jsonc` vars             |
| `TIFF_CONVERSION_SERVICE_URL` | Secret     | `https://tiff.awhq.uk`             | Set via `wrangler secret put`            |

**Access pattern in Astro endpoints:**

```typescript
import { env } from "cloudflare:workers";
const kv = env.PHOTO_CACHE;
const db = env.PHOTOS_DB;
const r2 = env.TIFF_STORAGE;
```

**Never commit secrets.** Use `wrangler secret put` for `TIFF_CONVERSION_SERVICE_URL`. Use `.dev.vars` for local development.

---

## Testing Guidelines

- **Unit tests** (Vitest): Stores, lib utilities, formatters, API client. Located in `tests/unit/`.
- **Component tests** (Vitest + React Testing Library + jsdom): Interactive components (FilterPanel, SearchBar, PhotoCard). Located alongside components as `*.test.tsx` or in `tests/unit/`.
- **E2e tests** (Playwright): Full user flows -- search, view photo, compare, filter. Mobile (375px) and desktop (1440px) viewports. Located in `tests/e2e/`.
- **Run before every PR**: `npm run test && npm run type-check && npm run lint`.
- **Coverage targets**: Stores 90%+, lib utilities 80%+, components 70%+, e2e covers all primary user flows.

---

## Commit & Pull Request Guidelines

- **Conventional Commits**: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, `perf:`, `ci:`, `build:`.
- **Scope optional but encouraged**: `feat(search):`, `fix(map):`, `refactor(api):`.
- **One concern per commit.** Don't mix feature work with refactoring.
- **PRs must include**: Summary of changes, test commands to verify, screenshots/GIFs for any visual changes.
- **Bundle related changes**: Migrations + code that uses them in the same PR.

---

## External Services

| Service                              | Purpose                        | Notes                                      |
| ------------------------------------ | ------------------------------ | ------------------------------------------ |
| ArcGIS REST (Tasmania LIST)          | Aerial photo data source       | Three layers: 0=aerial, 1=ortho, 2=digital |
| Nominatim (OpenStreetMap)            | Geocoding                      | Tasmania-biased bounding box               |
| Custom TIFF service (`tiff.awhq.uk`) | URL/upload TIFF conversion     | 10-minute timeout                          |
| Cloudflare Workers AI                | Search enhancement, NL parsing | Llama 3 8B Instruct                        |
| Esri World Imagery                   | Map tiles + satellite export   | Used in Then vs Now comparison             |

---

## Development Progress Tracker

**Instructions**: Mark items `[x]` when complete. Add the date. Add new items as they emerge. Never delete completed items -- they serve as a record. If a task is blocked, note the blocker.

### Phase 0: Scaffold & Foundation

- [x] Write AGENTS.md (this file) -- 2026-03-15
- [x] Initialize Astro 6 project -- 2026-03-15
- [x] Add `@astrojs/cloudflare` adapter v13 -- 2026-03-15
- [x] Add `@astrojs/react` integration -- 2026-03-15
- [x] Configure `astro.config.mjs` (Cloudflare adapter, React, fonts, experimental flags) -- 2026-03-15
- [x] Create `wrangler.jsonc` with all existing bindings -- 2026-03-15
- [x] Install Mantine 8 (`@mantine/core`, `@mantine/hooks`, `@mantine/form`, `@mantine/notifications`) -- 2026-03-15
- [x] Install PostCSS plugins (`postcss-preset-mantine`, `postcss-simple-vars`) -- 2026-03-15
- [x] Create Mantine theme (`src/styles/theme.ts`) with emerald palette, dark/light, Inter font -- 2026-03-15
- [x] Create `BaseLayout.astro` with `ColorSchemeScript`, meta tags, font loading -- 2026-03-15
- [x] Create `AppLayout.astro` with responsive nav shell -- 2026-03-15
- [x] Install Zustand 5 and create store skeletons (search, filter, ui, comparison, favorites) -- 2026-03-15
- [x] Install TanStack Query v5 -- 2026-03-15
- [x] Install MapLibre GL JS -- 2026-03-15
- [x] Install OpenSeadragon 5 -- 2026-03-15
- [x] Create type definitions (env.d.ts, photo.ts, api.ts, map.ts) -- 2026-03-15
- [x] Create MantineWrapper provider component -- 2026-03-15
- [x] Create glassmorphic CSS module styles -- 2026-03-15
- [x] Create stub pages (search, compare, favorites, timeline, viewer) -- 2026-03-15
- [x] Create health check API route -- 2026-03-15
- [x] Create `.dev.vars` template (`.dev.vars.example`) -- 2026-03-15
- [x] Create PWA manifest -- 2026-03-15
- [x] Verify `astro build` completes successfully -- 2026-03-15
- [ ] Set up Vitest config
- [ ] Set up Playwright config
- [ ] Set up ESLint + Prettier + Husky + lint-staged
- [ ] Verify `npm run dev` starts and `workerd` serves a page

### Phase 1: Backend Port (API Routes)

- [ ] Port `src/lib/arcgis.ts` to `src/lib/arcgis.ts`
- [ ] Port `src/lib/cache.ts` to `src/lib/cache.ts`
- [ ] Port `src/lib/r2.ts` to `src/lib/r2.ts`
- [ ] Port `src/lib/image-conversion.ts`
- [ ] Port `src/lib/ai.ts`
- [ ] Port `src/lib/auth.ts`
- [ ] Create `src/types/photo.ts` (PhotoAttributes, EnhancedPhoto)
- [ ] Create `src/types/api.ts` (request/response types)
- [ ] Create `src/types/env.d.ts` (Cloudflare bindings augmentation)
- [ ] Create API route: `GET /api/health`
- [ ] Create API route: `GET /api/layers`
- [ ] Create API route: `GET /api/me`
- [ ] Create API route: `GET /api/search/location`
- [ ] Create API route: `GET /api/search/bounds`
- [ ] Create API route: `GET /api/images/tiff/[layerId]/[imageName]`
- [ ] Create API route: `GET /api/images/webp/[layerId]/[imageName]`
- [ ] Create API route: `PUT /api/images/webp/[layerId]/[imageName]`
- [ ] Create API route: `GET /api/images/thumbnail/[layerId]/[imageName]`
- [ ] Create API route: `GET /api/images/image/[layerId]/[imageName]`
- [ ] Create API routes: TIFF conversion (`tiff-url`, `tiff-upload`, `tiff-health`, `tiff-proxy`)
- [ ] Create API routes: AI endpoints (`enhance-search`, `parse-search`, `search-summary`)
- [ ] Create API routes: Favorites CRUD (D1-backed)
- [ ] Create API routes: Search history CRUD
- [ ] Add CORS middleware (Astro middleware in `src/middleware.ts`)
- [ ] Write unit tests for lib modules
- [ ] Verify all API routes work with `npm run dev` (workerd)

### Phase 2: Core Frontend -- Search & Map

- [ ] Create fetch-based API client (`src/lib/api-client.ts`)
- [ ] Port geocoding service (`src/lib/geocoding.ts`)
- [ ] Port search history manager (`src/lib/search-history.ts`)
- [ ] Create Zustand stores: `searchStore`, `filterStore`, `uiStore`
- [ ] Create `usePhotos` hook (TanStack Query)
- [ ] Create `useSearchState` hook (URL param sync)
- [ ] Build `SearchBar.tsx` (Mantine Spotlight-style, geocoding, history, presets)
- [ ] Build `Navigation.tsx` (desktop sidebar nav)
- [ ] Build `MobileNav.tsx` (bottom tab bar)
- [ ] Build `ThemeToggle.tsx` (light/dark/system cycle)
- [ ] Build `index.astro` page (landing with search)
- [ ] Build `search.astro` page (results layout with URL params)
- [ ] Build `MapView.tsx` (MapLibre GL island)
- [ ] Build `MapControls.tsx` (zoom, location, search-here)
- [ ] Build `PhotoFootprints.tsx` (GeoJSON polygon layer)
- [ ] Build `PinDrop.tsx` (click-to-search flow)
- [ ] Build `useMapSync.ts` hook (map <-> grid synchronization)
- [ ] Implement glassmorphic panel styles (`glass.module.css`)
- [ ] Mobile: Bottom sheet search, responsive results panel
- [ ] Test on mobile viewport (375px)

### Phase 3: Photo Display & Viewer

- [ ] Build `PhotoCard.tsx` (Mantine Card, lazy image, glassmorphic hover)
- [ ] Build `PhotoSkeleton.tsx` (Mantine Skeleton)
- [ ] Build `PhotoGrid.tsx` (Mantine SimpleGrid, pagination, sort, grouping)
- [ ] Build `PhotoTimeline.tsx` (Mantine Timeline, year grouping, jump nav)
- [ ] Build `timeline.astro` page
- [ ] Build `ImageViewer.tsx` (OpenSeadragon, smart zoom limits)
- [ ] Build `TiffConverter.tsx` (Web Worker hook, progressive loading)
- [ ] Port `tiff-conversion.worker.ts`
- [ ] Build `viewer/[layerId]/[imageName].astro` page
- [ ] Build `FilterPanel.tsx` (presets, date range, scale categories, layer toggles)
- [ ] Build `FilterPresets.tsx`
- [ ] Build `MobileFilterSheet.tsx` (Mantine Drawer bottom)
- [ ] Create `filterStore` with persist middleware
- [ ] Build `ErrorBoundary.tsx`
- [ ] Build `LoadingOverlay.tsx`
- [ ] Build `BackToTop.tsx`

### Phase 4: Comparison & Advanced Features

- [ ] Create `comparisonStore` (Zustand)
- [ ] Build `CompareSlider.tsx` (CSS clip-path, pointer capture)
- [ ] Build `CompareSideBySide.tsx` (synced pan/zoom)
- [ ] Build `ThenNow.tsx` (historical vs satellite, alignment controls)
- [ ] Build `compare.astro` page (URL params: `?photos=0:img1,1:img2`)
- [ ] Build `AISearchModal.tsx` (natural language search)
- [ ] Create `favoritesStore` (Zustand + D1 sync)
- [ ] Build `favorites.astro` page
- [ ] Implement keyboard shortcuts (comparison modes, navigation)

### Phase 5: Mobile Polish & PWA

- [ ] PWA manifest + service worker (Workbox)
- [ ] Offline tile caching for recently viewed map areas
- [ ] App install prompt component
- [ ] Swipe gestures for photo navigation in viewer
- [ ] Pull-to-refresh on search results
- [ ] Lighthouse audit (target: 90+ performance, 100 accessibility)
- [ ] Accessibility audit (axe-core, keyboard nav, screen reader)
- [ ] Touch target audit (44x44px minimum everywhere)
- [ ] `prefers-reduced-motion` compliance check
- [ ] iOS Safari quirks pass (safe area insets, overscroll, viewport height)

### Phase 6: Testing & Launch

- [ ] Unit tests: All stores (90%+ coverage)
- [ ] Unit tests: All lib utilities (80%+ coverage)
- [ ] Component tests: SearchBar, FilterPanel, PhotoCard, PhotoGrid
- [ ] E2e tests: Search flow (desktop + mobile)
- [ ] E2e tests: Photo viewer flow
- [ ] E2e tests: Comparison flow
- [ ] E2e tests: Filter + timeline flow
- [ ] Performance regression tests
- [ ] Deploy to staging
- [ ] Compare against current production
- [ ] Final cleanup and PR

---

## Architectural Decisions Log

Record non-obvious decisions here. Format: `[date] Decision: Reason.`

| Date       | Decision                                                          | Reason                                                                                                                                  |
| ---------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-15 | Astro 6 + Cloudflare adapter v13 over Astro 5                     | `workerd` in dev, no more Pages proxy, Vite 7 Environment API, built-in fonts                                                           |
| 2026-03-15 | Mantine 8 over MUI v7                                             | ~40% smaller bundle (CSS Modules vs Emotion runtime), built-in `colorScheme: 'auto'`, better mobile components (BottomSheet), 50+ hooks |
| 2026-03-15 | MapLibre GL over Leaflet                                          | GPU-accelerated, native pinch/rotate/tilt, vector tiles, smoother mobile experience                                                     |
| 2026-03-15 | Zustand over React Context                                        | Lightweight, no boilerplate, persist middleware, works outside React tree, no re-render cascades                                        |
| 2026-03-15 | Astro API routes over Hono                                        | One deployment (no separate Worker), bindings via `cloudflare:workers`, file-based routing, eliminates proxy layer                      |
| 2026-03-15 | Native `fetch` over Axios                                         | Axios is 13KB for no benefit in modern browsers. Cloudflare Workers use fetch natively                                                  |
| 2026-03-15 | Workers (not Pages) deployment                                    | Cloudflare recommends Workers for new projects. Pages support deprecated in adapter v13                                                 |
| 2026-03-15 | `@tabler/icons-react` over `lucide-react` + `@mui/icons-material` | Single icon set, standard for Mantine ecosystem, tree-shakeable                                                                         |

---

## Session Notes

Append a summary after each working session so the next session has context.

### Session 1 -- 2026-03-15

- Performed comprehensive review of the entire existing codebase (~12,000+ lines frontend, ~3,300 lines backend)
- Identified critical problems: 2,141-line App.tsx god component, 4 conflicting styling systems, 8 unused dependencies, no routing, no error boundaries, 1 test file total, mobile bolted on
- Designed full rewrite plan: Astro 6 + React 19 + Mantine 8 + MapLibre + Zustand
- Updated plan for Astro 6 specifics: `workerd` dev server, `cloudflare:workers` imports, Workers deployment, built-in fonts, experimental Rust compiler + queued rendering
- Created branch `feat/astro6-rewrite`
- Wrote this AGENTS.md
- Cleared old project files (clean slate approach -- old code accessible via `git show main:path`)
- Scaffolded full Astro 6 project: configs, layouts, types, styles, stores, stub pages, health API
- Fixed `~/.npmrc` stale Cloudflare internal registry token (was blocking `@cloudflare/vite-plugin` install)
- Installed Node 22 (required by Astro 6), configured wrangler with personal account
- Removed ConvertHub dependency (not used in this project)
- Verified `astro build` completes successfully
- Phase 0 substantially complete (remaining: Vitest, Playwright, ESLint/Prettier/Husky, dev server verification)

---

## Blockers & Open Questions

Track anything that needs resolution. Remove items when resolved (but note the resolution in Session Notes).

- None currently.

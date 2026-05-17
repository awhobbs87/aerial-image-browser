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

**This branch (`feat/astro6-rewrite`) is a ground-up rewrite** of the original React 19 + Vite + MUI + Hono application into a modern Astro 6 + React 19 stack. The styling direction changed on 2026-05-16 from Mantine CSS Modules to Tailwind CSS v4.

---

## Tech Stack

| Layer             | Technology                                  | Notes                                                                    |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------------------ |
| Meta-framework    | Astro 6                                     | Islands architecture, file-based routing, Cloudflare adapter v13         |
| UI framework      | React 19                                    | Islands via `client:load` / `client:visible` / `client:only="react"`     |
| Component library | Radix primitives + local components         | Radix for accessible dialogs/tooltips/sheets; native Tailwind-styled controls elsewhere |
| Styling           | Tailwind CSS v4                             | Official `@tailwindcss/vite` plugin. Tailwind utilities are the styling source of truth |
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
|   |   |-- global.css               # Tailwind import, theme tokens, global resets
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
- **CSS Modules**: Avoid new CSS Modules. Existing modules are migration debt and should be replaced with Tailwind utilities when touched.
- **API endpoints**: Return `Response` objects directly. Use `import { env } from 'cloudflare:workers'` for bindings.
- **No default exports** for React components (named exports only). Astro pages use default exports per Astro convention.
- **No emojis** in code, comments, or commit messages unless the user explicitly requests them.

---

## Styling Rules

- **One styling system**: Tailwind CSS v4 utilities. Do not add new Mantine CSS Modules, Emotion styles, `sx` props, or scoped Astro CSS for ordinary component styling.
- **Theme tokens** live in `src/styles/global.css` via Tailwind v4 `@theme`. Keep app colors, font family, and shared tokens there.
- **Dark/light mode**: Tailwind `dark:` utilities are driven by `html[data-theme='dark']`. Theme toggles must keep this attribute resolved to `light` or `dark`, even when the saved preference is `auto`.
- **Glassmorphism**: Use Tailwind utilities (`bg-white/..`, `dark:bg-..`, `backdrop-blur-*`, arbitrary shadows) directly in `className` / `class`. Do not reintroduce `glass.module.css` patterns when touching components.
- **Mobile-first**: Write mobile styles as the default. Use Tailwind responsive variants (`sm:`, `md:`, `lg:`) and only use `useMediaQuery` when rendering different component trees is necessary.
- **Touch targets**: Minimum 44x44px for all interactive elements (Apple HIG compliance).

---

## Mobile Optimization Rules

This app has a **heavy emphasis on mobile usability**. Every component must work excellently on phones.

1. **Bottom navigation** (tab bar) on mobile -- Search, Map, Timeline, Favorites. Always thumb-reachable.
2. **Bottom sheets** for filters, search suggestions, photo actions. Prefer Tailwind-styled native/headless implementations. Never full-screen modals on mobile.
3. **Native gestures** via MapLibre (pinch, rotate, two-finger tilt). No custom gesture implementations.
4. **No hamburger menus.** All primary navigation is always visible.
5. **Skeleton loading** on every data-dependent surface. No layout shift.
6. **Reduced motion**: Respect `prefers-reduced-motion` via global CSS and Tailwind motion variants.
7. **Viewport-aware rendering**: Prefer Tailwind responsive utilities. Use media-query hooks only for truly different component trees.
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
import { env } from 'cloudflare:workers';
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
- [x] Set up Vitest config -- 2026-03-15
- [x] Set up Playwright config -- 2026-03-15
- [x] Set up ESLint + Prettier (flat config) -- 2026-03-15
- [x] Set up Husky + lint-staged -- 2026-03-15
- [ ] Verify `npm run dev` starts and `workerd` serves a page

### Phase 1: Backend Port (API Routes)

- [x] Port `src/lib/arcgis.ts` -- 2026-03-15
- [x] Port `src/lib/cache.ts` -- 2026-03-15
- [x] Port `src/lib/r2.ts` -- 2026-03-15
- [x] Port `src/lib/image-conversion.ts` -- 2026-03-15
- [x] Port `src/lib/ai.ts` -- 2026-03-15
- [x] Port `src/lib/auth.ts` -- 2026-03-15
- [x] Create `src/lib/format.ts` (date/scale/coordinate formatters) -- 2026-03-15
- [x] Create `src/lib/search-helpers.ts` (shared enhancePhoto/applyFilters) -- 2026-03-15
- [x] Create `src/types/photo.ts` (PhotoAttributes, EnhancedPhoto) -- 2026-03-15 (Phase 0)
- [x] Create `src/types/api.ts` (request/response types) -- 2026-03-15 (Phase 0)
- [x] Create `src/types/env.d.ts` (Cloudflare bindings augmentation) -- 2026-03-15 (Phase 0)
- [x] Create API route: `GET /api/health` -- 2026-03-15 (Phase 0)
- [x] Create API route: `GET /api/layers` -- 2026-03-15
- [x] Create API route: `GET /api/me` -- 2026-03-15
- [x] Create API route: `GET /api/search/location` -- 2026-03-15
- [x] Create API route: `GET /api/search/bounds` -- 2026-03-15
- [x] Create API route: `GET /api/images/tiff/[layerId]/[imageName]` -- 2026-03-15
- [x] Create API route: `GET /api/images/webp/[layerId]/[imageName]` -- 2026-03-15
- [x] Create API route: `PUT /api/images/webp/[layerId]/[imageName]` -- 2026-03-15
- [x] Create API route: `GET /api/images/thumbnail/[layerId]/[imageName]` -- 2026-03-15
- [x] Create API route: `GET /api/images/image/[layerId]/[imageName]` -- 2026-03-15
- [x] Create API routes: TIFF conversion (`tiff-url`, `tiff-upload`, `tiff-health`, `tiff-proxy`) -- 2026-03-15
- [x] Create API routes: AI endpoints (`enhance-search`, `parse-search`, `search-summary`) -- 2026-03-15
- [x] Create API routes: Favorites CRUD (D1-backed) -- 2026-03-15
- [x] Create API routes: Search history CRUD (KV-backed) -- 2026-03-15
- [x] Add CORS middleware (Astro middleware in `src/middleware.ts`) -- 2026-03-15
- [x] Write unit tests for lib modules (arcgis, cache, auth, format, search-helpers) -- 2026-03-15
- [ ] Verify all API routes work with `npm run dev` (workerd)

### Phase 2: Core Frontend -- Search & Map

- [x] Create fetch-based API client (`src/lib/api-client.ts`) -- 2026-03-15
- [x] Create geocoding service (`src/lib/geocoding.ts`) -- 2026-03-15
- [x] Create search history client (`src/lib/search-history.ts`) -- 2026-03-15
- [x] Create Zustand stores: `searchStore`, `filterStore`, `uiStore` -- 2026-03-15 (Phase 0)
- [x] Create `usePhotos` hook (TanStack Query) -- 2026-03-15
- [x] Create `useSearchState` hook (URL param sync) -- 2026-03-15
- [x] Build `SearchBar.tsx` (geocoding, debounced, presets, keyboard nav) -- 2026-03-15
- [x] Build `LandingSearchBar.tsx` (wrapper for index page island) -- 2026-03-15
- [x] Build `Navigation.tsx` (desktop sidebar nav, glassmorphic) -- 2026-03-15
- [x] Build `MobileNav.tsx` (bottom tab bar, safe area insets) -- 2026-03-15
- [x] Build `ThemeToggle.tsx` (light/dark/system cycle) -- 2026-03-15
- [x] Build `index.astro` page (landing with search island) -- 2026-03-15
- [x] Build `search.astro` page (map + results layout with islands) -- 2026-03-15
- [x] Build `MapView.tsx` (MapLibre GL, OSM tiles, fly-to) -- 2026-03-15
- [x] Build `MapControls.tsx` (zoom, location, search-here) -- 2026-03-15
- [x] Build `PhotoFootprints.tsx` (GeoJSON polygon layer) -- 2026-03-15
- [x] Build `PinDrop.tsx` (click-to-search marker) -- 2026-03-15
- [x] Build `useMapSync.ts` hook (map <-> search synchronization) -- 2026-03-15
- [x] Build `ErrorBoundary.tsx` (Mantine-styled fallback) -- 2026-03-15
- [x] Build `LoadingOverlay.tsx` (container + full-page modes) -- 2026-03-15
- [x] Implement glassmorphic panel styles (`glass.module.css`) -- 2026-03-15 (Phase 0)
- [x] Mobile: Bottom tab nav + responsive results panel -- 2026-03-15
- [ ] Test on mobile viewport (375px)

### Phase 3: Photo Display & Viewer

- [x] Build `PhotoCard.tsx` (Mantine Card, lazy image, glassmorphic hover, favorite toggle) -- 2026-03-15
- [x] Build `PhotoSkeleton.tsx` (Mantine Skeleton) -- 2026-03-15
- [x] Build `PhotoGrid.tsx` (Mantine SimpleGrid, decade grouping, sort, load-more) -- 2026-03-15
- [x] Build `PhotoTimeline.tsx` (Mantine Timeline, year grouping, jump nav) -- 2026-03-15
- [x] Build `timeline.astro` page -- 2026-03-15
- [x] Build `ImageViewer.tsx` (OpenSeadragon, zoom/rotate/fullscreen controls) -- 2026-03-15
- [x] Build `TiffConverter.tsx` (server + client conversion, progress UI) -- 2026-03-15
- [x] Port `tiff-conversion.worker.ts` (Web Worker, utif2 + OffscreenCanvas) -- 2026-03-15
- [x] Build `viewer/[layerId]/[imageName].astro` page -- 2026-03-15
- [x] Build `FilterPanel.tsx` (layer toggles, date range, scale chips, reset) -- 2026-03-15
- [x] Build `FilterPresets.tsx` (quick filter buttons) -- 2026-03-15
- [x] Build `MobileFilterSheet.tsx` (Mantine Drawer bottom) -- 2026-03-15
- [x] Create `filterStore` with persist middleware -- 2026-03-15 (Phase 0)
- [x] Build `ErrorBoundary.tsx` -- 2026-03-15 (moved to Phase 2)
- [x] Build `LoadingOverlay.tsx` -- 2026-03-15 (moved to Phase 2)
- [x] Build `BackToTop.tsx` -- 2026-03-15
- [x] Build `useTiffConversion` hook -- 2026-03-15

### Phase 4: Comparison & Advanced Features

- [x] Create `comparisonStore` (Zustand) -- 2026-03-15 (Phase 0)
- [x] Build `CompareSlider.tsx` (CSS clip-path, pointer capture) -- 2026-03-15
- [x] Build `CompareSideBySide.tsx` (responsive layout) -- 2026-03-15
- [x] Build `ThenNow.tsx` (historical vs Esri satellite, bbox export) -- 2026-03-15
- [x] Build `compare.astro` page -- 2026-03-15
- [x] Build `AISearchModal.tsx` (NL query parsing, geocoding, filter application) -- 2026-03-15
- [x] Create `favoritesStore` (Zustand + persist) -- 2026-03-15 (Phase 0)
- [x] Build `favorites.astro` page (FavoritesContent, card grid, empty state) -- 2026-03-15
- [x] Implement keyboard shortcuts (useKeyboardShortcuts hook + KeyboardShortcutsHelp modal) -- 2026-03-15

### Phase 5: Mobile Polish & PWA

- [x] PWA service worker (vanilla JS, network-first/cache-first strategies) -- 2026-03-15
- [x] Offline tile caching for recently viewed map areas (via sw.js cache-first) -- 2026-03-15
- [x] App install prompt component (AppInstallPrompt.tsx) -- 2026-03-15
- [x] ServiceWorkerRegistration component with update notifications -- 2026-03-15
- [x] Offline fallback page (public/offline.html) -- 2026-03-15
- [ ] Swipe gestures for photo navigation in viewer
- [ ] Pull-to-refresh on search results
- [ ] Lighthouse audit (target: 90+ performance, 100 accessibility)
- [x] Accessibility audit (skip-to-content link, aria-labels, ARIA landmarks) -- 2026-03-15
- [x] Touch target audit (44x44px minimum in global.css, scoped to buttons/controls) -- 2026-03-15
- [x] `prefers-reduced-motion` compliance check (verified in global.css) -- 2026-03-15
- [x] iOS Safari quirks pass (safe area insets, overscroll-behavior, -webkit-overflow-scrolling) -- 2026-03-15
- [x] Mobile viewport/gesture overhaul for landing and search routes -- 2026-05-18
- [x] Anchor mobile bottom navigation with explicit viewport reserve and no search-route document scroll -- 2026-05-18
- [x] Fix MapLibre mobile pinch/rotate competition with page scroll (`touch-action: none` on map canvas/container) -- 2026-05-18
- [x] Lock mobile landing page to one viewport and prevent focused-search keyboard scroll gap -- 2026-05-18

### Phase 6: Testing & Launch

- [x] Unit tests: All stores (5 store test files, 203 tests total passing) -- 2026-03-15
- [x] Unit tests: All lib utilities (arcgis, cache, auth, format, search-helpers) -- 2026-03-15
- [x] Component tests: SearchBar, FilterPanel, PhotoCard, PhotoGrid -- 2026-03-15
- [x] E2e tests: Search flow (desktop + mobile) -- 2026-03-15
- [x] E2e tests: Photo viewer flow -- 2026-03-15
- [x] E2e tests: Comparison flow -- 2026-03-15
- [x] E2e tests: Filter + timeline flow -- 2026-03-15
- [ ] Performance regression tests
- [ ] Deploy to staging
- [ ] Compare against current production
- [ ] Final cleanup and PR

### Phase 7: Tailwind CSS Migration

- [x] Install Tailwind CSS v4 and `@tailwindcss/vite` -- 2026-05-16
- [x] Configure Astro/Vite to use the official Tailwind v4 plugin -- 2026-05-16
- [x] Replace Mantine-specific PostCSS config with empty PostCSS config -- 2026-05-16
- [x] Remove unused Mantine PostCSS packages (`postcss-preset-mantine`, `postcss-simple-vars`) -- 2026-05-16
- [x] Add Tailwind `@import`, `@theme`, and dark variant plumbing in `src/styles/global.css` -- 2026-05-16
- [x] Convert landing page from scoped Astro CSS to Tailwind utilities -- 2026-05-16
- [x] Convert desktop and mobile navigation from CSS Modules to Tailwind utilities -- 2026-05-16
- [x] Convert `SearchBar` styling from CSS Module/Mantine core components to Tailwind utilities + native controls -- 2026-05-16
- [x] Deploy Tailwind foundation before full cutover -- 2026-05-16 (`986e4127-9912-47f6-8403-478593b99277`)
- [x] Install Radix primitives for dialogs, sheets, tooltips, popovers/select-style primitives -- 2026-05-16
- [x] Convert remaining CSS Modules to Tailwind utilities (`PhotoCard`, `PhotoGrid`, `PhotoTimeline`, map controls, viewer, compare, favorites, filters) -- 2026-05-16
- [x] Replace remaining Mantine UI components with Tailwind-styled native/Radix components -- 2026-05-16
- [x] Remove Mantine dependencies and imports once no longer used -- 2026-05-16
- [x] Landing page full visual overhaul with satellite-backed hero and leaner composition -- 2026-05-16
- [x] Replace satellite landing hero with oversized rotating wireframe globe -- 2026-05-16
- [x] Reset theme default to system/auto unless user explicitly chooses light/dark/system -- 2026-05-17
- [x] Rework landing/shell colors from single-hue tint to neutral archival surfaces with amber/cyan accents -- 2026-05-16
- [x] Disable Astro dev toolbar and service-worker update toast during local visual review -- 2026-05-16
- [x] Fix landing light/dark class mismatch and stale localStorage light-mode pinning -- 2026-05-17
- [x] Verify `npm run lint`, `npm run type-check`, and `npm run build` after cutover -- 2026-05-16
- [x] Run visual regression pass for landing light mode on mobile and desktop -- 2026-05-16
- [x] Run visual regression pass for landing auto-dark, explicit-light, explicit-dark, and mobile auto-dark -- 2026-05-17
- [x] Run mobile visual/metric pass for landing search focus and search map route -- 2026-05-18
- [x] Run mobile focused-search regression for landing no-scroll and hidden tab bar while keyboard is active -- 2026-05-18
- [ ] Run visual regression pass for remaining app routes in light/dark on mobile and desktop

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
| 2026-05-16 | Tailwind CSS v4 over Mantine CSS Modules                          | User requested a pure Tailwind direction after dark-mode inconsistencies exposed the cost of mixing Mantine theme state with CSS `light-dark()` |
| 2026-05-16 | Wireframe globe uses Three.js with 2D canvas fallback              | Real browsers get the 3D renderer; automated/headless or WebGL-restricted environments still render the high-resolution rotating globe for QA |
| 2026-05-18 | Mobile search uses a fixed viewport shell with an internally scrolling results panel | Prevents the document scroll container from competing with the fixed bottom nav and MapLibre touch gestures on mobile |
| 2026-05-18 | Hide the mobile tab bar while the landing search input is focused | iOS Safari can otherwise keep fixed chrome above the keyboard and expose a blank scroll gap beneath it |

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

### Session 2 -- 2026-03-15

- Deployed 13 parallel agents (Wave 1) to complete Phase 0, Phase 1, and Phase 2 simultaneously
- Wave 1 completed all backend work:
  - Phase 0: Created vitest.config.ts, playwright.config.ts, eslint.config.js, tests/ directory structure
  - Phase 1 libs: Ported arcgis.ts, cache.ts, r2.ts, auth.ts, ai.ts, image-conversion.ts; created format.ts, search-helpers.ts
  - Phase 1 API routes: All 20 endpoints created (layers, me, search/location, search/bounds, images/tiff, images/webp GET+PUT, images/thumbnail, images/image, convert/tiff-health, convert/tiff-url, convert/tiff-upload, convert/tiff-proxy, ai/enhance-search, ai/parse-search, ai/search-summary, favorites CRUD, search-history CRUD)
  - Phase 1 middleware: CORS middleware in src/middleware.ts
  - Phase 2 libs: api-client.ts, geocoding.ts, search-history.ts
  - Phase 2 layout: Navigation.tsx, MobileNav.tsx, ThemeToggle.tsx
- Deployed 5 parallel agents (Wave 2) for remaining Phase 2 frontend:
  - SearchBar.tsx with geocoding autocomplete, debounce, presets, keyboard nav
  - MapView.tsx, MapControls.tsx, PhotoFootprints.tsx, PinDrop.tsx
  - Hooks: usePhotos.ts, useSearchState.ts, useMapSync.ts
  - Pages: index.astro (landing with search island), search.astro (map + results layout)
  - Common: ErrorBoundary.tsx, LoadingOverlay.tsx
- Also created LandingSearchBar.tsx (thin wrapper needed because Astro can't serialize callback props across server/client boundary)
- Installed additional packages: @eslint/js, globals, typescript-eslint, jsdom, @vitest/coverage-v8, utif2, @cloudflare/workers-types
- Verified `astro build` completes successfully with all new files
- Total files created this session: ~70 files (src/lib: 9, src/pages/api: 20, src/components: 14, src/hooks: 3, configs: 4, tests/.gitkeep: 3)
- Known pre-existing LSP issue: `Property 'X' does not exist on type 'Env'` in all API routes -- the `cloudflare:workers` module augmentation in env.d.ts isn't resolving in local TS server. Build succeeds fine.
- Remaining for Phase 0: Husky + lint-staged, dev server verification
- Remaining for Phase 1: Unit tests for lib modules, dev server verification
- Remaining for Phase 2: Mobile viewport testing (375px)

### Session 3 -- 2026-03-15

- Committed and pushed Phase 0-2 work (62 files, 5,330 insertions)
- Deployed 10 parallel agents for Phase 3 + Phase 4 simultaneously
- Phase 3 completed all photo display & viewer components:
  - PhotoCard.tsx with glassmorphic hover, favorite toggle, compare button, layer badges
  - PhotoSkeleton.tsx loading placeholder
  - PhotoGrid.tsx with decade grouping, sort controls, load-more pagination
  - PhotoTimeline.tsx with year grouping, sticky jump nav, horizontal scroll
  - ImageViewer.tsx with OpenSeadragon deep-zoom, controls overlay, info bar
  - TiffConverter.tsx with server + client conversion, progress UI
  - tiff-conversion.worker.ts Web Worker (utif2 + OffscreenCanvas)
  - FilterPanel.tsx, FilterPresets.tsx, MobileFilterSheet.tsx
  - BackToTop.tsx floating button
  - useTiffConversion.ts hook with state machine
  - Rewrote timeline.astro and viewer/[layerId]/[imageName].astro pages
- Phase 4 completed all comparison & advanced features:
  - CompareSlider.tsx (CSS clip-path, pointer capture)
  - CompareSideBySide.tsx (responsive layout)
  - ThenNow.tsx (historical vs Esri satellite export)
  - AISearchModal.tsx (NL query parsing -> geocoding -> filter application)
  - FavoritesContent.tsx with card grid, empty state, clear all
  - Rewrote compare.astro and favorites.astro pages
- Total files created: 29 files, 2,301 insertions
- Committed and pushed Phase 3-4 work
- Verified `astro build` succeeds with all ~100 files
- Remaining: Phase 5 (mobile polish/PWA), Phase 6 (testing/launch), keyboard shortcuts

### Session 4 -- 2026-03-15

- Deployed 9 parallel agents + 1 retry for remaining Phases 0, 1, 4, 5, 6
- Phase 0: Set up Husky + lint-staged pre-commit hooks
- Phase 1: Created unit tests for all lib modules (arcgis, cache, auth, format, search-helpers)
- Phase 4: Built useKeyboardShortcuts hook + KeyboardShortcutsHelp modal
- Phase 5: Created PWA service worker (sw.js) with network-first/cache-first strategies
  - Offline fallback page (offline.html)
  - ServiceWorkerRegistration component with update notifications
  - AppInstallPrompt component for PWA install banner
  - Accessibility audit: added skip-to-content, aria-labels, role attributes
  - Touch target audit: scoped 44px min-height to buttons/controls (not all anchors)
  - Verified prefers-reduced-motion in global.css
  - iOS Safari fixes: overscroll-behavior, -webkit-overflow-scrolling
- Phase 6: Created comprehensive test suite (203 tests total, all passing):
  - 5 store test files (searchStore, filterStore, uiStore, comparisonStore, favoritesStore)
  - 5 lib test files (arcgis, cache, auth, format, search-helpers)
  - 4 component test files (SearchBar, FilterPanel, PhotoCard, PhotoGrid)
  - 5 e2e test stubs (navigation, search-flow, viewer-flow, comparison-flow, filter-flow)
  - Fixed Zustand test pattern: `setState(data, true)` wipes actions; use `setState(data)` merge
  - Fixed vitest config to exclude tests/e2e/ from unit test runner
  - Added test setup with window.matchMedia + ResizeObserver mocks for Mantine
- Also created SearchResults.tsx component (wires usePhotos hook to PhotoGrid)
- Verified `astro build` succeeds and all 203 unit/component tests pass
- Remaining: Swipe gestures, pull-to-refresh, Lighthouse audit, perf tests, staging deploy

### Session 5 -- 2026-03-16

- Diagnosed GitHub Actions deploy pipeline failure (run 23111132227):
  - Root cause: workflow assumed a `frontend/` monorepo subdirectory (`cd frontend && npm ci`, `npm run build:frontend`, `wrangler pages deploy dist --project-name=...`) — none of these exist in the Astro 6 rewrite which is a single-package repo at root deploying to Workers (not Pages)
  - Additional issue: workflow used Node 20 (deprecated in GitHub Actions, `.nvmrc` requires Node 22)
- Rewrote `.github/workflows/deploy-pages.yml` → renamed conceptually to Workers deploy:
  - Removed `frontend/` directory references
  - Node version: 20 → 22
  - Build: `npm run build:frontend` → `npx astro build`
  - Deploy: `wrangler pages deploy dist` → `npx wrangler deploy`
  - Removed `paths:` filter so all pushes to `main` trigger deploy (not just `frontend/**` changes)
- Added to `wrangler.jsonc`:
  - Custom domain route: `aerial-explorer.awhq.uk/*` (zone: `awhq.uk`)
  - Observability: `enabled: true`
  - Analytics Engine dataset binding: `ANALYTICS` → `tas-aerial-browser` dataset
- Note: `ANALYTICS` binding is now available in Worker code via `import { env } from 'cloudflare:workers'` as `env.ANALYTICS`

### Session 6 -- 2026-03-16

- Diagnosed and fixed three categories of bugs in date display, scale filtering, and grid grouping.

**Date / year bugs fixed:**

- Added `extractYearFromLayerName(layerName)` helper in `src/lib/search-helpers.ts` that parses the `PROJ_NAME` field (e.g. `"Hobart 82"` → 1982, `"HUON 1974"` → 1974) as a fallback when `FLY_DATE` / `CAPTURE_START_DATE` is absent or zero.
- Rules: 4-digit years (1900–2099) used directly; 2-digit years 46–99 → 1900+n (earliest surveys were 1946), 00–25 → 2000+n.
- `enhancePhoto()` now calls this fallback after the timestamp path fails.
- Fixed `PhotoAttributes` type to match the actual ArcGIS UPPER_CASE field names (`FLY_DATE`, `PROJ_NAME`, `IMAGE_NAME`, etc.) that `enhancePhoto` reads. The old PascalCase interface (`Date_Flown`, `Layer_Name`) was a dead stub.

**Scale filter bugs fixed:**

- `scaleCategories` in the filter store was present in the query key but never translated to `minScale`/`maxScale` API params — scale chips were cosmetic no-ops.
- Added `resolveScaleRange()` in `src/hooks/usePhotos.ts` that converts selected category keys to a unioned `{ minScale, maxScale }` range and appends them to both `usePhotos` and `usePhotosByBounds` API calls.
- Realigned `SCALE_CATEGORIES` in `src/types/photo.ts` from 5 bands (with a wrong 1:50k breakpoint) to 4 bands matching the original app: `very-detailed` (≤ 1:5,000), `detailed` (1:5,001–15,000), `standard` (1:15,001–40,000), `overview` (> 1:40,000).
- Rewrote `FilterPresets.tsx` to include scale constraints: `High Detail` now sets `scaleCategories: ['very-detailed','detailed']`; added `Standard Scale` and `Overview` scale presets.

**PhotoGrid grouping restored:**

- Added a `groupBy` toggle (decade / year / none) rendered as a `NativeSelect` next to the existing sort control.
- Extracted `getGroupKey()` and `compareGroupKeys()` helpers so the grouping logic is testable and clear.
- Fixed the sort dropdown labels (was `'Scale'` ambiguously, now `'Scale (large)'` / `'Scale (small)'`).
- Fixed stale test assertions: `PhotoGrid.test.tsx` expected `'3 photos found'`; component renders `'3 photos'`. `FilterPanel.test.tsx` expected old scale label strings; updated to new labels.
- All 209 unit tests pass after fixes.

### Session 7 -- 2026-05-16

- User requested moving the app to a pure Tailwind styling direction after dark mode rendered with a light glass panel and dark-mode text.
- Root cause of the dark-mode screenshot: custom CSS relied on `light-dark()` while Mantine's color-scheme state and the browser `color-scheme` resolution were not consistently aligned.
- Installed Tailwind CSS v4 and `@tailwindcss/vite`; configured the official Tailwind Vite plugin in `astro.config.mjs`.
- Replaced the Mantine-specific PostCSS plugin config with an empty PostCSS config and removed the now-unused PostCSS Mantine packages.
- Added Tailwind import, theme tokens, and a dark variant keyed off `html[data-mantine-color-scheme='dark']` in `src/styles/global.css`.
- Converted the landing page, desktop navigation, mobile navigation, and SearchBar styling to Tailwind utilities.
- Deleted CSS Modules for the converted shell/search components: `Navigation.module.css`, `MobileNav.module.css`, and `SearchBar.module.css`.
- Left remaining Mantine components in place as migration debt rather than breaking the app in one pass; Phase 7 tracks the remaining conversion.

### Session 8 -- 2026-05-16

- Deployed the Tailwind foundation state to Cloudflare Workers before continuing:
  - Workers URL: `https://tas-aerial-browser.awhobbs.workers.dev`
  - Custom route: `aerial-explorer.awhq.uk/*`
  - Version ID: `986e4127-9912-47f6-8403-478593b99277`
- Completed the Radix + Tailwind full cutover:
  - Removed Mantine packages (`@mantine/core`, `@mantine/form`, `@mantine/hooks`, `@mantine/notifications`)
  - Removed `MantineWrapper`, `theme.ts`, Mantine CSS imports, Mantine test provider, and remaining Mantine color-scheme naming
  - Added `AppProviders`, local hooks (`useMediaQuery`, `useDebouncedValue`, `useClickOutside`), `cn`, Radix-backed `Dialog` and `Tooltip`
  - Converted common components, filters, map controls, photo grid/cards/timeline, preview modal, favorites, compare views, AI search modal, TIFF converter, and image viewer to Tailwind/native/Radix components
  - Deleted remaining component CSS Modules and unused `glass.module.css`
- Performed polish pass for speed/snap:
  - Shorter transitions, less heavy glass/shadow, denser controls, lighter card hover transforms, native inputs/selects, reduced panel chrome
  - Landing page rebuilt as a satellite-backed first viewport with prominent search, quick location chips, and compact status cards
- Verified after cutover: `npm run lint`, `npm run type-check`, and `npm run build` all pass.

### Session 9 -- 2026-05-16

- User clarified the landing page should use a Cloudflare-inspired oversized wireframe globe, not a textured/static image, and that the issue was overall clunky color/icon usage rather than simply removing green.
- Replaced the satellite-backed landing hero with `EarthGlobe.tsx`:
  - Three.js wireframe globe for normal browser rendering
  - High-resolution Canvas 2D fallback when WebGL is unavailable, which keeps visual regression tests useful in headless Chromium
  - Globe is oversized and anchored under the lower-right page corner with slow rotation
- Reworked landing page visual language:
  - Neutral archival paper surface, large editorial hero type, faint grid, amber archive/search accents, cyan only for the globe/map infrastructure
  - Updated search field, location chips, and status cards to reduce the previous glassy/green-tinted feel
- Updated app shell polish:
  - Theme default is now light unless the user explicitly chooses dark or system
  - Desktop/mobile navigation use neutral surfaces and amber active state
  - Mobile nav now includes Timeline per the mobile navigation plan
  - Disabled Astro dev toolbar and dev-time service worker update toast so screenshots are not polluted by local-only UI
- Verified:
  - `npm run format`
  - `npm run lint`
  - `npm run type-check`
  - `npm run build`
  - Playwright desktop/mobile landing checks against `http://127.0.0.1:4321/`: canvas nonblank, globe pixels changed over time, theme resolved to light, no Astro toolbar, no update toast.

### Session 10 -- 2026-05-17

- User reported dark mode detection was broken; screenshot showed light page background with dark-mode-only landing panels/text, plus system/browser dark chrome.
- Fixed two root causes:
  - Landing page had many dark-looking Tailwind classes without light-mode alternatives; rewrote those surfaces/copy/chips/cards/footer classes to have explicit light defaults and `dark:` variants.
  - Earlier work could leave `localStorage.theme-preference = "light"` even when the user had not explicitly selected light; added `theme-preference-explicit` migration guard so stale implicit light values fall back to system/auto detection.
- Updated theme bootstrap and shared theme helpers:
  - `BaseLayout.astro` inline script now ignores stored theme unless `theme-preference-explicit` is true.
  - `src/lib/theme.ts` and `src/lib/theme-swap.ts` follow the same rule.
  - `setPreference()` now marks the preference as explicit when the user cycles the theme.
- Verified:
  - `npm run format`
  - `npm run lint`
  - `npm run type-check`
  - `npm run build`
- Playwright checks for desktop auto-dark with stale `theme-preference=light` (resolves dark), desktop explicit-light (stays light), desktop explicit-dark (stays dark), mobile auto-dark, and mobile explicit-light.

### Session 11 -- 2026-05-18

- User requested a mobile optimisation overhaul after issues with the bottom nav, rubber-band scrolling, and awkward pinch zoom.
- Reworked mobile layout/gesture handling:
  - `AppLayout.astro` now exposes a `--mobile-nav-height` reserve and clips horizontal overflow.
  - `search.astro` mobile layout is a viewport-sized shell; map is fixed within the route and results scroll inside `.search-panel-content`.
  - `global.css` now applies stronger root/body overflow and overscroll containment, removes the overly broad `body:has([data-state='open'])` touch lock, and forces MapLibre canvas/container `touch-action: none`.
  - `MapView.tsx` enables native MapLibre touch zoom/rotate/pitch and removes Tailwind pan-touch classes that could compete with pinch gestures.
  - `SearchBar.tsx` clamps the portaled autocomplete dropdown to the visual viewport so focused mobile search does not run under the tab bar.
  - `index.astro` mobile spacing was tightened so landing search focus no longer introduces document overflow at 375x812.
- Browser QA at 375x812:
  - Landing route: document/body width 375, height 812; focused search dropdown stays above bottom nav.
  - Search route: document/body height 812; `.search-layout` height 748 above 64px nav; `.search-panel-content` is the only vertical scroller; MapLibre canvas reports `touch-action: none`.
- Verified `npm run lint`, `npm run type-check`, and `npm run build` all pass.

### Session 12 -- 2026-05-18

- User provided an iPhone screenshot showing the landing page after opening search and exiting/scrolling: the mobile tab bar floated above a blank gap while the keyboard was still active.
- Fixed landing-specific mobile viewport behavior:
  - `index.astro` landing root is now an exact-height mobile viewport rather than a `min-height` page, and internal spacing was tightened so the landing fits without document scroll.
  - `global.css` locks `html`, `body`, `#app-root`, and `.page-shell` for the landing route on mobile using route-scoped `:has(.landing-page)` selectors.
  - When the landing search input is focused, the mobile tab bar is hidden and the app-root bottom reserve is removed so iOS cannot leave fixed app chrome floating above the keyboard.
  - `LandingSearchBar.tsx` watches the shared search focus state and pins `scrollTop` back to 0 during visual viewport resize/scroll events.
- Browser QA at 375x812:
  - Before focus: document/body `scrollHeight` equals `clientHeight` (812), landing area is 748px above the 64px tab bar.
  - Focused search: document/body still `scrollTop: 0`; `.landing-page` is 812px; mobile nav display is `none`; dropdown is visible and contained.
- Verified `npm run lint`, `npm run type-check`, and `npm run build` all pass.

---

## Blockers & Open Questions

Track anything that needs resolution. Remove items when resolved (but note the resolution in Session Notes).

- None currently.

# 🏗️ Tasmania Aerial Photos - Complete Build Guide for Claude Code

**Single-File Development Guide | Start from Scratch | Version 1.0.0**

---

## 🎯 What You're Building

A modern web application for browsing Tasmania's aerial photography archives with:

- Cloudflare Workers API (TypeScript + Hono)
- React 19 frontend (TypeScript + Material UI + Tailwind CSS v4)
- Interactive Leaflet maps
- R2 TIFF caching with proxy endpoints
- D1 user database
- Mobile-responsive design with dark/light mode

**Data Source:** Tasmania DPIPWE public ArcGIS REST API  
**Time:** 20-25 hours over 2-4 weeks  
**Starting Point:** NOTHING - You create everything from scratch

---

## 📋 Prerequisites

- Node.js 18+, Git installed
- Cloudflare account (Enterprise with unlimited Workers/R2)
- GitHub account
- Code editor (VS Code recommended)

---

## 🏗️ Project Architecture

```
tas-aerial-browser/
├── .github/workflows/ci.yml
├── .husky/
│   ├── pre-commit          # Linting checks
│   └── commit-msg          # Commit format validation
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── lib/            # API client, utilities
│   │   ├── hooks/          # React Query hooks
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── src/
│   ├── routes/api.ts       # API endpoints
│   ├── lib/
│   │   ├── arcgis.ts       # ArcGIS client
│   │   ├── cache.ts        # KV caching
│   │   └── r2.ts           # R2 storage
│   ├── types/index.ts      # TypeScript types
│   └── index.ts            # Worker entry
├── migrations/
│   └── 0001_initial.sql    # D1 schema
├── scripts/version.js      # Version automation
├── package.json
├── wrangler.toml
├── vitest.config.ts
└── BUILD_WITH_CLAUDE_CODE.md (this file)
```

---

## 🚀 Stage 0: Repository Setup (30 minutes)

### Tasks

**0.1 - Create GitHub repository `tas-aerial-browser`**

- Make it public
- Add description: "Modern web app for browsing Tasmania's aerial photography archives"
- Initialize with README
- Choose MIT license

```bash
git clone https://github.com/YOUR_USERNAME/tas-aerial-browser.git
cd tas-aerial-browser
```

**0.2 - Create `.gitignore`**

```gitignore
node_modules/
.wrangler/
.dev.vars
.env
.env.local
dist/
*.log
.DS_Store
.vscode/
.idea/
coverage/
frontend/dist/
```

**0.3 - Create `LICENSE` (MIT)**

**0.4 - Initial commit**

```bash
git add .
git commit -m "chore: initial project setup"
git push origin main
```

✅ Stage 0 Complete

---

## 🔧 Stage 1: Project Foundation (2-3 hours)

### Objective

Set up complete dev environment with backend/frontend structure, tooling, pre-commit hooks, and Cloudflare resources.

### 1.1 - Root Package Setup

Create `package.json`:

```json
{
  "name": "tas-aerial-browser",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "dev:frontend": "cd frontend && npm run dev",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:frontend\"",
    "build:frontend": "cd frontend && npm run build",
    "build": "npm run build:frontend",
    "deploy": "npm run build && wrangler deploy",
    "db:migrate": "wrangler d1 migrations apply PHOTOS_DB",
    "db:migrate:local": "wrangler d1 migrations apply PHOTOS_DB --local",
    "type-check": "tsc --noEmit && cd frontend && npm run type-check",
    "lint": "cd frontend && npm run lint",
    "lint:fix": "cd frontend && npm run lint:fix",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,md,json}\"",
    "test": "npm run test:backend && npm run test:frontend",
    "test:backend": "vitest run --config vitest.config.ts",
    "test:watch": "vitest --config vitest.config.ts",
    "test:frontend": "cd frontend && npm run test",
    "prepare": "husky install",
    "release:patch": "npm version patch -m 'chore(release): %s'",
    "release:minor": "npm version minor -m 'chore(release): %s'",
    "release:major": "npm version major -m 'chore(release): %s'"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "@types/node": "^20.10.0",
    "concurrently": "^8.2.2",
    "husky": "^8.0.3",
    "lint-staged": "^15.2.0",
    "prettier": "^3.1.1",
    "typescript": "^5.7.2",
    "vitest": "^1.0.4",
    "wrangler": "^3.94.0"
  },
  "dependencies": {
    "hono": "^4.6.14"
  },
  "lint-staged": {
    "frontend/src/**/*.{ts,tsx}": ["cd frontend && npm run lint:fix"],
    "src/**/*.ts": ["prettier --write"],
    "*.md": ["prettier --write"]
  }
}
```

Install:

```bash
npm install
```

### 1.2 - TypeScript Config

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2021",
    "lib": ["ES2021"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "frontend", "dist"]
}
```

### 1.3 - Wrangler Config

Create `wrangler.toml`:

```toml
name = "tas-aerial-browser"
main = "src/index.ts"
compatibility_date = "2024-11-11"

[[kv_namespaces]]
binding = "PHOTO_CACHE"
id = "" # Fill after creation

[[d1_databases]]
binding = "PHOTOS_DB"
database_name = "tas-browser"
database_id = "" # Fill after creation

[[r2_buckets]]
binding = "TIFF_STORAGE"
bucket_name = "tas-aerial-browser-tiffs"

[[r2_buckets]]
binding = "THUMBNAIL_STORAGE"
bucket_name = "tas-aerial-browser-thumbnails"

[vars]
API_BASE_URL = "https://services.thelist.tas.gov.au/arcgis/rest/services/AerialPhotoViewer/AerialPhoto_TimeV2/MapServer"
```

### 1.4 - Husky Git Hooks

```bash
npm run prepare
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env bash
set -e

echo "🔍 Running pre-commit checks..."

if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
    echo "📝 Linting frontend..."
    cd frontend && npm run lint && cd ..
fi

echo "🔧 Type checking..."
npm run type-check

echo "✅ Pre-commit checks passed!"
```

Create `.husky/commit-msg`:

```bash
#!/usr/bin/env bash

commit_msg=$(cat "$1")
pattern="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,100}$"

if ! echo "$commit_msg" | grep -qE "$pattern"; then
    echo "❌ Invalid commit format!"
    echo "Use: <type>(<scope>): <description>"
    echo "Example: feat(api): add TIFF caching"
    exit 1
fi
```

Make executable:

```bash
chmod +x .husky/pre-commit .husky/commit-msg
```

### 1.5 - Initialize React Frontend

```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
```

Update `frontend/package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\"",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Install frontend dependencies:

```bash
npm install react@19 react-dom@19
npm install @tanstack/react-query @tanstack/react-router axios date-fns leaflet react-leaflet
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material

npm install -D @types/react@19 @types/react-dom@19 @types/leaflet @testing-library/react @testing-library/jest-dom vitest jsdom postcss tailwindcss@next @tailwindcss/postcss prettier prettier-plugin-tailwindcss eslint-plugin-react-hooks

cd ..
```

### 1.6 - Configure Tailwind CSS v4

Create `frontend/postcss.config.js`:

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

Create `frontend/src/index.css`:

```css
@import "tailwindcss";
```

### 1.7 - React Query Setup

Create `frontend/src/lib/queryClient.ts`:

```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### 1.8 - D1 Database Schema

Create `migrations/0001_initial.sql`:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE favorites (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  photo_object_id INTEGER NOT NULL,
  photo_layer_id INTEGER NOT NULL,
  photo_name TEXT NOT NULL,
  photo_metadata TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_favorites_user ON favorites(user_id);
CREATE INDEX idx_favorites_photo ON favorites(photo_object_id, photo_layer_id);

CREATE TABLE search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  search_type TEXT NOT NULL,
  search_params TEXT NOT NULL,
  results_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_search_history_user ON search_history(user_id);
CREATE INDEX idx_search_history_created ON search_history(created_at);
```

### 1.9 - Vitest Config

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

### 1.10 - Create Cloudflare Resources

```bash
npx wrangler login
npx wrangler kv:namespace create "PHOTO_CACHE"
# Copy ID to wrangler.toml

npx wrangler d1 create tas-browser
# Copy database_id to wrangler.toml

npm run db:migrate:local

npx wrangler r2 bucket create tas-aerial-browser-tiffs
npx wrangler r2 bucket create tas-aerial-browser-thumbnails
```

### 1.11 - Create CHANGELOG.md

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Project foundation setup
```

### Stage 1 Complete

```bash
git add .
git commit -m "feat: complete project foundation setup"
git push
```

---

## 🌐 Stage 2: Core API Development (3-4 hours)

### Objective

Build type-safe API with ArcGIS client, caching, and R2 integration.

### 2.1 - TypeScript Types

Create `src/types/index.ts`:

```typescript
export interface Bindings {
  PHOTO_CACHE: KVNamespace;
  PHOTOS_DB: D1Database;
  TIFF_STORAGE: R2Bucket;
  THUMBNAIL_STORAGE: R2Bucket;
  API_BASE_URL: string;
}

export interface PhotoAttributes {
  OBJECTID: number;
  IMAGE_NAME: string;
  FLY_DATE?: number;
  FLY_SEASON?: string;
  SCALE?: number;
  RESOLUTION?: number;
  IMAGE_TYPE?: string;
  PROJ_NAME?: string;
  DOWNLOAD_LINK?: string;
  THUMBNAIL_LINK?: string;
  [key: string]: any;
}

export interface EnhancedPhoto extends PhotoAttributes {
  layerId: number;
  layerType: "aerial" | "ortho" | "digital";
  dateFormatted: string | null;
  scaleFormatted: string | null;
  cached: boolean;
  thumbnailCached: boolean;
}
```

### 2.2 - ArcGIS Client

Create `src/lib/arcgis.ts`:

```typescript
export class ArcGISClient {
  constructor(private baseUrl: string) {}

  async queryByPoint(layerId: number, lon: number, lat: number) {
    const params = new URLSearchParams({
      f: "json",
      geometry: `${lon},${lat}`,
      geometryType: "esriGeometryPoint",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
    });

    const response = await fetch(`${this.baseUrl}/${layerId}/query?${params}`);
    if (!response.ok) throw new Error(`ArcGIS API error: ${response.status}`);

    const data = await response.json();
    return data.features || [];
  }

  async queryByBounds(
    layerId: number,
    west: number,
    south: number,
    east: number,
    north: number
  ) {
    const geometry = JSON.stringify({
      xmin: west,
      ymin: south,
      xmax: east,
      ymax: north,
      spatialReference: { wkid: 4326 },
    });

    const params = new URLSearchParams({
      f: "json",
      geometry,
      geometryType: "esriGeometryEnvelope",
      spatialRel: "esriSpatialRelIntersects",
      outFields: "*",
      returnGeometry: "true",
      outSR: "4326",
    });

    const response = await fetch(`${this.baseUrl}/${layerId}/query?${params}`);
    if (!response.ok) throw new Error(`ArcGIS API error: ${response.status}`);

    const data = await response.json();
    return data.features || [];
  }

  async getLayers() {
    const response = await fetch(`${this.baseUrl}/layers?f=json`);
    if (!response.ok) throw new Error(`ArcGIS API error: ${response.status}`);
    return await response.json();
  }
}
```

### 2.3 - Cache & R2 Managers

Create `src/lib/cache.ts`:

```typescript
export class CacheManager {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.kv.get(key, "json");
    return cached as T | null;
  }

  async set<T>(key: string, value: T, ttl = 86400): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
  }
}
```

Create `src/lib/r2.ts`:

```typescript
export class R2Manager {
  constructor(
    private tiffBucket: R2Bucket,
    private thumbnailBucket: R2Bucket
  ) {}

  async hasTiff(imageName: string, layerId: number): Promise<boolean> {
    const key = `tiff/${layerId}/${imageName}.tif`;
    const obj = await this.tiffBucket.head(key);
    return obj !== null;
  }

  async hasThumbnail(imageName: string, layerId: number): Promise<boolean> {
    const key = `thumbnail/${layerId}/${imageName}.jpg`;
    const obj = await this.thumbnailBucket.head(key);
    return obj !== null;
  }
}
```

### 2.4 - API Routes

Create `src/routes/api.ts`:

```typescript
import { Hono } from "hono";
import { ArcGISClient } from "../lib/arcgis";
import { CacheManager } from "../lib/cache";
import { R2Manager } from "../lib/r2";
import type { Bindings, EnhancedPhoto } from "../types";

export const api = new Hono<{ Bindings: Bindings }>();

function formatDate(timestamp?: number): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function enhancePhoto(
  feature: any,
  layerId: number
): Omit<EnhancedPhoto, "cached" | "thumbnailCached"> {
  const attrs = feature.attributes;
  const layerType =
    layerId === 0 ? "aerial" : layerId === 1 ? "ortho" : "digital";

  return {
    ...attrs,
    layerId,
    layerType,
    dateFormatted: formatDate(attrs.FLY_DATE || attrs.CAPTURE_START_DATE),
    scaleFormatted: attrs.SCALE ? `1:${attrs.SCALE.toLocaleString()}` : null,
  };
}

api.get("/layers", async (c) => {
  const cache = new CacheManager(c.env.PHOTO_CACHE);
  const cached = await cache.get("layers:all");
  if (cached) return c.json({ success: true, data: cached, cached: true });

  const client = new ArcGISClient(c.env.API_BASE_URL);
  const layers = await client.getLayers();
  await cache.set("layers:all", layers);

  return c.json({ success: true, data: layers, cached: false });
});

api.get("/search/location", async (c) => {
  const lat = parseFloat(c.req.query("lat") || "");
  const lon = parseFloat(c.req.query("lon") || "");
  const layers = (c.req.query("layers") || "0,1,2").split(",").map(Number);

  if (isNaN(lat) || isNaN(lon)) {
    return c.json({ success: false, error: "Invalid coordinates" }, 400);
  }

  const client = new ArcGISClient(c.env.API_BASE_URL);
  const r2 = new R2Manager(c.env.TIFF_STORAGE, c.env.THUMBNAIL_STORAGE);

  const results = await Promise.all(
    layers.map(async (layerId) => {
      const features = await client.queryByPoint(layerId, lon, lat);
      return features.map((f: any) => enhancePhoto(f, layerId));
    })
  );

  const photos = results.flat() as EnhancedPhoto[];

  await Promise.all(
    photos.map(async (photo) => {
      if (photo.IMAGE_NAME) {
        photo.cached = await r2.hasTiff(photo.IMAGE_NAME, photo.layerId);
        photo.thumbnailCached = await r2.hasThumbnail(
          photo.IMAGE_NAME,
          photo.layerId
        );
      }
    })
  );

  photos.sort((a, b) => (b.FLY_DATE || 0) - (a.FLY_DATE || 0));

  return c.json({ success: true, data: { count: photos.length, photos } });
});

api.get("/search/bounds", async (c) => {
  const west = parseFloat(c.req.query("west") || "");
  const south = parseFloat(c.req.query("south") || "");
  const east = parseFloat(c.req.query("east") || "");
  const north = parseFloat(c.req.query("north") || "");

  if (isNaN(west) || isNaN(south) || isNaN(east) || isNaN(north)) {
    return c.json({ success: false, error: "Invalid bounds" }, 400);
  }

  const layers = (c.req.query("layers") || "0,1,2").split(",").map(Number);
  const client = new ArcGISClient(c.env.API_BASE_URL);
  const r2 = new R2Manager(c.env.TIFF_STORAGE, c.env.THUMBNAIL_STORAGE);

  const results = await Promise.all(
    layers.map(async (layerId) => {
      const features = await client.queryByBounds(
        layerId,
        west,
        south,
        east,
        north
      );
      return features.map((f: any) => enhancePhoto(f, layerId));
    })
  );

  const photos = results.flat() as EnhancedPhoto[];

  await Promise.all(
    photos.map(async (photo) => {
      if (photo.IMAGE_NAME) {
        photo.cached = await r2.hasTiff(photo.IMAGE_NAME, photo.layerId);
        photo.thumbnailCached = await r2.hasThumbnail(
          photo.IMAGE_NAME,
          photo.layerId
        );
      }
    })
  );

  return c.json({ success: true, data: { count: photos.length, photos } });
});
```

### 2.5 - Main Worker

Create `src/index.ts`:

```typescript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { api } from "./routes/api";
import type { Bindings } from "./types";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://your-domain.com"],
    credentials: true,
  })
);

app.route("/api", api);

app.get("/", (c) =>
  c.json({ name: "Tasmania Aerial Photos API", version: "1.0.0" })
);
app.notFound((c) => c.json({ success: false, error: "Not found" }, 404));
app.onError((err, c) =>
  c.json({ success: false, error: "Internal error" }, 500)
);

export default app;
```

### Test

```bash
npm run dev
curl http://localhost:8787/api/layers
curl "http://localhost:8787/api/search/location?lat=-42.8821&lon=147.3272"
```

### Stage 2 Complete

```bash
git add .
git commit -m "feat(api): implement core API with caching"
git push
```

---

## 🎨 Stage 3-10: Remaining Stages

**Stage 3:** TIFF caching with R2, proxy endpoint  
**Stage 4:** React components (Search, Gallery, Modal)  
**Stage 5:** React Query hooks, API client  
**Stage 6:** Leaflet map with photo footprints  
**Stage 7:** Filters (date, scale, type)  
**Stage 8:** D1 favorites system  
**Stage 9:** Mobile optimization  
**Stage 10:** Production deployment

> **Note:** After completing Stages 1-2, you can either:
>
> 1. Continue with the detailed BUILD_WITH_CLAUDE_CODE.md guide
> 2. Or ask Claude Code to generate the remaining stages based on your progress

---

## 📊 Progress Tracking

**Last Updated:** 2025-11-12

### Completed Stages

- ✅ **Stage 0: Repository Setup** (Completed)
  - Created `.gitignore`, `LICENSE`, updated guide.md with consistent naming
  - Initial commit and push to GitHub
  - Repository: https://github.com/awhobbs87/aerial-image-browser

- ✅ **Stage 1: Project Foundation** (Completed)
  - Root package.json with comprehensive scripts
  - TypeScript and Wrangler configuration
  - Husky git hooks for linting and commit validation
  - React 19 frontend initialized with Vite
  - Material UI (MUI) for React 19 components
  - Tailwind CSS v4 configured
  - React Query setup
  - D1 database schema created (users, favorites, search_history)
  - Vitest configuration
  - All Cloudflare resources created:
    - KV Namespace: `6b0c54bb697d44c5b8dd97f02141bfdf`
    - D1 Database: `f71d5cc3-1fc3-4888-94bd-e73b02a4823f`
    - R2 Buckets: tiffs and thumbnails
    - Account ID configured

- ✅ **Connection Testing** (Completed)
  - Health check endpoint deployed at `/health`
  - All connections verified: D1 ✅, KV ✅, R2 TIFF ✅, R2 Thumbnail ✅
  - Worker deployed: https://tas-aerial-browser.awhobbs.workers.dev

- ✅ **Stage 2: Core API Development** (Completed)
  - TypeScript types created (`Bindings`, `PhotoAttributes`, `EnhancedPhoto`)
  - ArcGIS client implemented with point and bounds queries
  - Fixed spatial reference issue (added `inSR=4326` parameter)
  - Cache manager with KV get/set operations
  - R2 manager with TIFF and thumbnail operations
  - API routes implemented:
    - `GET /api/layers` - Returns ArcGIS layer metadata (with KV caching)
    - `GET /api/search/location?lat=X&lon=Y` - Search by coordinates
    - `GET /api/search/bounds?west=X&south=Y&east=Z&north=W` - Search by bounding box
  - Test page deployed at `/test` with interactive UI
  - Verified with Tasmania coordinates: Hobart (499 photos), Launceston (331 photos)

- ✅ **Stage 3: TIFF Caching & Proxying** (Completed)
  - TIFF proxy endpoint: `GET /api/tiff/:layerId/:imageName`
    - Downloads TIFFs from ArcGIS on first request (X-Cache: MISS)
    - Caches in R2 TIFF_STORAGE bucket
    - Serves from R2 on subsequent requests (X-Cache: HIT)
    - Tested with 67.29 MB TIFF file (1462_029.tif)
  - Thumbnail proxy endpoint: `GET /api/thumbnail/:layerId/:imageName`
    - Downloads thumbnails from ArcGIS on first request
    - Caches in R2 THUMBNAIL_STORAGE bucket
    - Serves from R2 on subsequent requests
    - Tested with 244 KB thumbnail (1437_025.jpg)
  - Both endpoints set proper content-type headers and long cache durations
  - Verified files stored in R2 buckets successfully

- ✅ **Stage 4 & 5: React Frontend with Material UI** (Completed)
  - **TypeScript Types** (`frontend/src/types/api.ts`)
    - Mirrored all backend types
    - `PhotoAttributes`, `EnhancedPhoto`, `LayerType`
    - API response types with full type safety
  - **API Client** (`frontend/src/lib/apiClient.ts`)
    - Axios-based singleton client
    - Type-safe methods: `searchByLocation()`, `searchByBounds()`, `getLayers()`
    - Helper methods: `getThumbnailUrl()`, `getTiffUrl()`
    - Error handling and interceptors
  - **MUI Theme** (`frontend/src/theme.ts`)
    - Light and dark themes with custom palettes
    - Component overrides for Cards, Buttons, Chips
    - Professional typography
  - **React Query Hooks** (`frontend/src/hooks/usePhotos.ts`)
    - `useSearchLocation`, `useSearchBounds`, `useLayers`
    - Automatic caching and refetching
  - **Material UI Components**
    - `AppBar` - Header with dark/light mode toggle
    - `SearchBar` - Lat/lon input + location presets (Hobart, Launceston, etc.)
    - `PhotoCard` - Card with thumbnail, metadata, layer badges, actions
    - `PhotoGrid` - Responsive grid with pagination (12 photos/page)
  - **App.tsx** - Complete layout
    - QueryClientProvider + ThemeProvider
    - AppBar + main content + footer
    - Welcome screen + search + results display
    - Favorites functionality (client-side)
  - **Vite Configuration**
    - API proxy to deployed worker
    - Dev server on port 5173
  - Frontend running at: http://localhost:5173

### Remaining Stages

- ✅ **Stage 6: Leaflet Maps Integration** (Complete)
- ✅ **Stage 7: Filtering & Search UI** (Complete)
- ✅ **Stage 8: Enhanced Search UX & Polish** (Complete)
- ✅ **Stage 9: Performance Optimization** (Complete)
- ✅ **Stage 10: Advanced Interface & UX Improvements** (Complete)
- 🔴 **Stage 11: Mobile Optimization & PWA** (Next)
- 🔴 **Stage 12: Production Deployment & Testing**

**Notes:**

- Stages 0-5 completed in ~3 sessions
- Fixed deprecated `node_compat` issue in wrangler.toml
- Fixed ArcGIS spatial reference issue (missing `inSR` parameter)
- All Cloudflare bindings verified and operational
- Test page available at: https://tas-aerial-browser.awhobbs.workers.dev/test
- API fully functional with caching working correctly
- Frontend fully functional with Material UI and dark/light mode
- React 19 with Material UI provides modern, responsive interface

---

## 🐛 Troubleshooting

**Husky not running:**

```bash
chmod +x .husky/*
```

**TypeScript errors:**

```bash
npm run type-check
```

**Wrangler auth:**

```bash
npx wrangler logout && npx wrangler login
```

**D1 migration fails:**

```bash
npx wrangler d1 migrations list PHOTOS_DB
```

---

## 📚 Resources

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Hono Framework](https://hono.dev/)
- [React Query](https://tanstack.com/query/latest)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

## 🎯 Git Commit Format

Required format (enforced by hook):

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build, revert

Examples:
feat(api): add TIFF caching endpoint
fix(gallery): resolve loading issue
docs: update API reference
```

---

## ✅ Completion Checklist

After each stage:

- [ ] All tasks completed
- [ ] Tests passing
- [ ] Code formatted
- [ ] Types correct
- [ ] Committed with conventional format
- [ ] Progress tracking updated

---

## 🚀 Next Session: Leaflet Maps Integration

### Session Goals

Add interactive Leaflet maps to visualize photo footprints and enable map-based searching.

### Phase 1: Leaflet Setup (Stage 6)

**Tasks:**
1. Import Leaflet CSS in `index.css`
   ```css
   @import "tailwindcss";
   @import "leaflet/dist/leaflet.css";
   ```

2. Fix Leaflet marker icons (known Vite issue)
   ```typescript
   // In a utility file or map component
   import L from 'leaflet';
   import markerIcon from 'leaflet/dist/images/marker-icon.png';
   import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
   import markerShadow from 'leaflet/dist/images/marker-shadow.png';

   delete L.Icon.Default.prototype._getIconUrl;
   L.Icon.Default.mergeOptions({
     iconUrl: markerIcon,
     iconRetinaUrl: markerIcon2x,
     shadowUrl: markerShadow,
   });
   ```

### Phase 2: Map Components (Stage 6)

**Tasks:**
1. **MapView Component** (`frontend/src/components/MapView.tsx`)
   - React-Leaflet MapContainer
   - TileLayer with OpenStreetMap
   - Center on Tasmania by default
   - Click handler to search location
   - Zoom controls

2. **PhotoMarkers Component** (`frontend/src/components/PhotoMarkers.tsx`)
   - Display polygon footprints for photos
   - Use different colors for layer types (aerial/ortho/digital)
   - Popup with photo metadata on click
   - Highlight on hover

3. **MapSearchBar Component** (integrate with existing SearchBar)
   - Add "Search on map" option
   - Display current map center coordinates
   - "Use map location" button

### Phase 3: Update App Layout (Stage 6)

**Tasks:**
1. Add MUI Tabs or Toggle for Grid/Map view
2. Create split view option (map on left, photos on right)
3. Update PhotoCard to show "Show on map" button
4. Sync map and photo selection

### 📋 Prompt for Next Session

```
I'm continuing work on the Tasmania Aerial Browser project.

Current status:
- ✅ Stage 0-1: Foundation complete (Cloudflare resources, worker setup)
- ✅ Stage 2: Core API with ArcGIS integration (499 photos in Hobart, 331 in Launceston)
- ✅ Stage 3: TIFF/thumbnail caching with R2 (verified working)
- ✅ Stage 4-5: React 19 frontend with Material UI complete
  - Frontend running at http://localhost:5173
  - SearchBar with location presets, PhotoGrid with pagination
  - Dark/light mode toggle, responsive design
  - React Query hooks for data fetching
- ✅ Stage 6: Leaflet Maps Integration complete
  - MapView component with OpenStreetMap tiles centered on Tasmania
  - PhotoMarkers component rendering polygon footprints
  - Color-coded by layer type (aerial: blue, ortho: green, digital: red)
  - Selected photos highlighted in gold
  - Popups with photo metadata
  - Grid/Map view toggle with Material UI ToggleButtonGroup
  - "Show on map" button in PhotoCards
  - Photo selection synced between grid and map views
  - Map click to search location
- ✅ Stage 7: Advanced Filtering System complete
  - FilterPanel component with collapsible accordion UI
  - Date range picker using MUI DatePicker
  - Scale range slider (1:1K to 1:100K)
  - Image type checkboxes (aerial/ortho/digital)
  - Clear filters button
  - Backend filtering on date, scale, and image type
  - Filters applied to both location and bounds searches
- ✅ Stage 8: Enhanced Search UX & Polish complete
  - Geocoding service using Nominatim (OpenStreetMap) API
  - Address autocomplete search with debounced suggestions
  - "Near Me" button with browser geolocation
  - Search history with localStorage (last 10 searches)
  - Quick location chips (Hobart, Launceston, Devonport, Burnie)
  - SearchBar completely redesigned with modern gradient styling
  - FilterPanel redesigned with modern gradient styling matching SearchBar
  - Active filter chips displayed above filter panel
  - Individual filter chip deletion (clear date, scale, or layer filters separately)
  - Toggle button group for image types (replaced checkboxes)
  - Better visual hierarchy with icons for each filter section
  - Smooth animations and improved spacing
  - Recent searches dropdown with timestamps ("2 hours ago")
  - Reverse geocoding to show location names for coordinates
- ✅ Stage 9: Performance Optimization complete
  - LazyImage component with Intersection Observer API
  - Images load only when entering viewport (50px margin)
  - Skeleton loading placeholders for smooth UX
  - React.memo on PhotoCard to prevent unnecessary re-renders
  - useCallback for all event handlers in App.tsx
  - Code splitting: MapView dynamically imported with lazy()
  - MapView in separate chunk (162KB) loaded only when needed
  - Suspense boundary with loading spinner for MapView
  - Improved React Query caching (10min stale, 60min gc)
  - Pagination already provides virtualization (12 photos/page)
  - Main bundle: 835KB (257KB gzipped)
  - Node.js 22 set as default with .nvmrc file
  - Progressive image loading with fade-in animation
- ✅ **Stage 10: Advanced Interface & UX Improvements** (Complete)
  - System-responsive dark mode (auto-detects OS preference)
  - Theme persistence in localStorage (light/dark/system)
  - Theme toggle with 3 states (☀️ light → 🌙 dark → 🔄 system)
  - Desktop two-column layout: Sidebar (40%) + Persistent Map (60%)
  - Sidebar contains: SearchBar, FilterPanel, Results with scrolling
  - Map always visible on desktop, toggle on mobile
  - Enhanced map polygon styling with:
    - Dashed borders for unselected polygons
    - Solid borders for selected polygons
    - Reduced opacity (15%) to see overlapping areas
    - Hover effects (increased opacity and weight)
    - Better color contrast: deeper indigo, green, red
  - Auto-zoom and centering for address search:
    - Map centers on search location (zoom level 13)
    - Search location marked with red pin
    - Auto-fit bounds to show all photo polygons
  - Results grouping by year/decade:
    - Sort options: Newest First / Oldest First
    - Group by: None / By Year / By Decade
    - Collapsible accordions with photo counts
    - Sort order applies to grouped results
  - Tooltips and help text:
    - Photo scale explanation with examples
    - Image type definitions (Aerial/Ortho/Digital)
    - Help icons (❓) next to technical terms
  - Visual polish and refinements:
    - Enhanced color palette with success/error/warning/info colors
    - Improved shadows and depth (elevation system)
    - Smooth animations and transitions (cubic-bezier easing)
    - Better typography with letter spacing
    - Rounded corners (12px border radius)
    - Button hover effects with lift animation
    - Chip hover effects with scale transform
    - Professional gradient backgrounds
    - Consistent spacing and padding

Worker API: https://tas-aerial-browser.awhobbs.workers.dev
Test page: https://tas-aerial-browser.awhobbs.workers.dev/test
Frontend (Local): http://localhost:5174
Frontend (Production): https://tas-aerial-explorer.pages.dev
Frontend (Latest Deploy): https://63cb79f9.tas-aerial-explorer.pages.dev

**Stage 10 Complete!** ✅

All advanced interface and UX improvements have been successfully implemented. The application now features:
- Responsive dark mode with system preference detection
- Modern two-column desktop layout with persistent map
- Enhanced map interactions with improved polygon styling
- Smart auto-zoom for search results
- Flexible results grouping and sorting options
- Comprehensive tooltips and help text
- Professional visual polish throughout

---

## 🖼️ Stage 11: High-Quality Image Serving with WASM Conversion

### ⚠️ Status: BLOCKED - TIFF Compatibility Issues

**Implementation:** ✅ Complete | **Functionality:** ❌ Non-functional due to TIFF format incompatibility

### Overview

Currently, the application serves TIFF files directly for maximum quality, but TIFFs are large (~15-20MB) and not optimized for web viewing. This stage attempted to implement a WASM-based image conversion system that:

1. Converts TIFF files to web-optimized PNG or WebP format
2. Preserves all fine details for zooming to see buildings and structures
3. Caches converted images in R2 for fast subsequent access
4. Uses progressive enhancement (first request slow, then cached)

### Architecture

```
User Request
    ↓
Worker Endpoint (/api/thumbnail or /api/tiff)
    ↓
Check R2 for converted image
    ↓
    ├─ Found → Serve from R2 (fast)
    ↓
    └─ Not Found → Process TIFF
        ↓
        Fetch original TIFF from source
        ↓
        Load WASM library (vips or ImageMagick)
        ↓
        Convert TIFF → PNG/WebP with quality settings
        ↓
        Store in R2 with cache headers
        ↓
        Serve converted image
```

### Technology Options

#### ⚠️ Implementation Reality Check (January 2025)

After testing multiple WASM libraries, here are the actual results:

**Tested Libraries:**
1. **wasm-vips** - ❌ Not compatible with Cloudflare Workers
2. **@cf-wasm/photon** - ⚠️ Limited TIFF support (cannot decode LZW-compressed TIFFs)
3. **@imagemagick/magick-wasm** - ❌ Bundle too large for Workers (8-10MB)

**Key Finding:** Tasmania's aerial photo TIFFs use LZW compression which @cf-wasm/photon cannot decode. The error returned is "unreachable" from WASM, indicating the TIFF decoder doesn't support this compression format.

#### Option 1: @cf-wasm/photon (Cloudflare Workers Optimized)

**Status:** ✅ Deploys successfully, ⚠️ Cannot decode Tasmania's TIFFs

**Pros:**
- Specifically compiled for Cloudflare Workers
- Excellent performance when it works
- Good WebP/PNG/JPEG output quality
- Smaller WASM bundle (~1.5MB)
- Well-maintained by Cloudflare community

**Cons:**
- **CRITICAL**: Cannot decode LZW-compressed TIFFs (Tasmania's format)
- Limited TIFF codec support
- Only works with uncompressed or basic TIFF formats

**Package:** `@cf-wasm/photon` (https://github.com/cf-wasm/photon)

#### Option 2: wasm-vips

**Status:** ❌ Not compatible with Cloudflare Workers

**Tried:** Initial implementation attempt
**Result:** Module import errors, incompatible with Workers runtime

**Package:** `wasm-vips` (https://github.com/kleisauke/wasm-vips)

#### Option 3: ImageMagick WASM

**Status:** ❌ Bundle too large

**Issue:** WASM bundle (8-10MB) exceeds Workers bundle size limits

**Package:** `@imagemagick/magick-wasm` (https://github.com/dlemstra/magick-wasm)

### ✅ Recommended Solution: Direct TIFF Serving

Given the limitations above, the current implementation of serving TIFFs directly remains the best approach:

**Advantages:**
- Zero conversion latency
- Preserves maximum quality
- No WASM compatibility issues
- No Worker memory concerns
- R2 caching still provides fast delivery

**Disadvantages:**
- Larger file sizes (15-20MB per TIFF)
- Some browsers may not have native TIFF support

### Implementation Plan

#### 11.1 - Setup R2 Bucket for Converted Images

```bash
# Create R2 bucket for converted images
npx wrangler r2 bucket create tas-aerial-converted

# Update wrangler.toml
```

**wrangler.toml additions:**
```toml
[[r2_buckets]]
binding = "CONVERTED_IMAGES"
bucket_name = "tas-aerial-converted"
preview_bucket_name = "tas-aerial-converted-preview"
```

#### 11.2 - Install WASM Library

```bash
npm install wasm-vips
```

#### 11.3 - Create Image Conversion Worker Route

**src/routes/convert.ts:**
```typescript
import { Hono } from 'hono';
import Vips from 'wasm-vips';

const app = new Hono<{ Bindings: Env }>();

// Initialize vips (lazy load)
let vips: any = null;

async function getVips() {
  if (!vips) {
    vips = await Vips();
  }
  return vips;
}

app.get('/api/image/:layerId/:imageName', async (c) => {
  const { layerId, imageName } = c.req.param();
  const format = c.req.query('format') || 'png'; // png or webp
  const quality = parseInt(c.req.query('quality') || '95', 10);

  // Generate R2 key for converted image
  const r2Key = `converted/${layerId}/${imageName}.${format}`;

  // Check R2 cache first
  const cached = await c.env.CONVERTED_IMAGES.get(r2Key);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        'Content-Type': format === 'webp' ? 'image/webp' : 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Cache': 'HIT',
      },
    });
  }

  // Fetch original TIFF
  const tiffUrl = `https://data.thelist.tas.gov.au/.../${imageName}`;
  const tiffResponse = await fetch(tiffUrl);

  if (!tiffResponse.ok) {
    return c.json({ error: 'TIFF not found' }, 404);
  }

  const tiffBuffer = await tiffResponse.arrayBuffer();

  // Convert using wasm-vips
  const vipsInstance = await getVips();
  const image = vipsInstance.Image.newFromBuffer(tiffBuffer);

  // Resize if needed (optional - preserve full quality)
  // const resized = image.resize(0.5);

  // Convert to target format
  let outputBuffer: Buffer;
  if (format === 'webp') {
    outputBuffer = image.webpsaveBuffer({ Q: quality, effort: 6 });
  } else {
    outputBuffer = image.pngsaveBuffer({ compression: 6 });
  }

  // Store in R2
  await c.env.CONVERTED_IMAGES.put(r2Key, outputBuffer, {
    httpMetadata: {
      contentType: format === 'webp' ? 'image/webp' : 'image/png',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  return new Response(outputBuffer, {
    headers: {
      'Content-Type': format === 'webp' ? 'image/webp' : 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Cache': 'MISS',
    },
  });
});

export default app;
```

#### 11.4 - Update API Client to Use Conversion Endpoint

**frontend/src/lib/apiClient.ts:**
```typescript
// Change getTiffUrl and getThumbnailUrl to use conversion endpoint
getTiffUrl(imageName: string, layerId: number): string {
  return `${this.baseUrl}/api/image/${layerId}/${imageName}?format=webp&quality=95`;
}

getThumbnailUrl(imageName: string, layerId: number): string {
  return `${this.baseUrl}/api/image/${layerId}/${imageName}?format=webp&quality=85&size=thumbnail`;
}
```

#### 11.5 - Add Size Parameter for Thumbnails

Enhance the conversion endpoint to support thumbnail generation:

```typescript
const size = c.req.query('size'); // 'thumbnail' | 'full'

if (size === 'thumbnail') {
  // Resize to 400px width, maintain aspect ratio
  const resized = image.resize(400 / image.width);
  outputBuffer = resized.webpsaveBuffer({ Q: quality, effort: 6 });
} else {
  // Full quality conversion
  outputBuffer = image.webpsaveBuffer({ Q: quality, effort: 6 });
}
```

### Quality Settings

**For Maximum Detail Preservation:**
- PNG: `compression: 6` (balance between size and speed)
- WebP: `Q: 95`, `effort: 6` (near-lossless, excellent detail)
- For thumbnails: `Q: 85` (good balance)

**For Smaller File Sizes:**
- PNG: `compression: 9` (maximum compression)
- WebP: `Q: 80-85`, `effort: 6` (still high quality)

### Benefits

1. **Quality Preservation**: WebP at Q:95 preserves fine details for zooming
2. **File Size Reduction**: ~80-90% smaller than TIFF (20MB → 2-4MB)
3. **Browser Compatibility**: WebP/PNG work in all modern browsers
4. **Progressive Enhancement**: First load slow, subsequent loads instant
5. **Caching**: R2 stores converted images permanently
6. **Cost Efficiency**: Only convert once per image

### Trade-offs

1. **First Request Latency**: 5-15 seconds for initial conversion
2. **Worker Memory**: Requires sufficient memory (recommend 512MB-1GB Worker)
3. **WASM Bundle Size**: Adds 2-3MB to Worker bundle
4. **Cold Start**: WASM initialization takes ~500ms

### Testing

```bash
# Test conversion endpoint
curl "https://tas-aerial-browser.awhobbs.workers.dev/api/image/0/1437_025.tif?format=webp&quality=95"

# Check R2 cache
npx wrangler r2 object list tas-aerial-converted

# Test with different quality settings
curl "...?format=webp&quality=80"
curl "...?format=png"
```

### Performance Benchmarks (Expected)

- **TIFF Size**: 15-20MB
- **WebP (Q:95)**: 2-4MB (80-85% reduction)
- **WebP (Q:85)**: 1-2MB (90-93% reduction)
- **PNG**: 8-12MB (40-50% reduction)
- **First Conversion**: 5-15 seconds
- **Cached Response**: <100ms

### Alternative: External Processing

If Worker memory limits are too restrictive, consider:

1. **Pre-processing**: Batch convert all TIFFs offline and store in R2
2. **External Service**: Use Cloudflare Images or Imgix for on-demand conversion
3. **Hybrid Approach**: Pre-convert thumbnails, on-demand convert full images

### Status

- [x] R2 bucket created for converted images (tas-aerial-converted)
- [x] @cf-wasm/photon installed and tested
- [x] Conversion endpoint implemented (src/routes/convert.ts)
- [x] Deployed successfully to Workers
- [x] Testing completed - **RESULT: Photon cannot decode Tasmania's LZW-compressed TIFFs**
- [x] wasm-vips tested - incompatible with Workers
- [x] Alternative approaches evaluated
- [x] **Decision: Continue serving TIFFs directly (current implementation)**

**Conclusion:** Stage 11 investigation complete. WASM-based TIFF conversion is not viable for this dataset due to compression format incompatibility. The existing direct TIFF serving approach via R2 caching remains the optimal solution.

---

Next up: Stage 12 - Mobile Optimization & PWA

### Testing Checklist

After implementation, verify:
- [x] `/api/layers` returns Tasmania layer information
- [x] `/api/search/location?lat=-42.8821&lon=147.3272` returns aerial photos
- [x] `/api/search/bounds?west=147.0&south=-43.0&east=147.5&north=-42.5` works
- [x] TIFF download stores in R2 and returns cached version on second request
- [x] Thumbnails download and cache properly
- [x] KV cache stores layer metadata for 24 hours
- [x] Frontend can search and display results with Material UI
- [x] Dark/light mode toggle works
- [x] Mobile responsive layout
- [x] Error handling works (invalid coords, network errors)
- [x] Loading states show MUI skeletons/spinners
- [x] Map displays photo footprints as colored polygons
- [x] Map click to search location
- [x] Photo selection syncs between grid and map
- [x] Grid/Map view toggle works
- [x] "Show on map" button in PhotoCards
- [x] Production deployment successful (Cloudflare Pages)
- [x] Advanced filters (date, scale, type)
- [x] Date range filtering working
- [x] Scale range filtering working
- [x] Image type filtering working
- [x] Search history functionality with localStorage
- [x] Geocoding with Nominatim API
- [x] Address autocomplete search
- [x] "Near Me" geolocation button
- [x] Modern filter panel styling with gradient backgrounds
- [x] Active filter chips
- [x] Performance optimization (lazy loading, code splitting, memoization)
- [x] Lazy loading images with Intersection Observer
- [x] Code splitting with dynamic imports
- [x] React.memo and useCallback optimizations
- [x] Improved React Query caching
- [ ] Favorites persist in D1 database
- [ ] PWA support with service worker
- [ ] Mobile optimization

---

**Version:** 1.0.0-dev
**Last Updated:** 2025-11-13
**Status:** Stage 10 Complete - Advanced Interface & UX Improvements Finished | Stage 11 Documented

🎯 **Current Focus:** Stage 10 complete! System-responsive dark mode, two-column desktop layout, enhanced map polygons, auto-zoom search, results grouping/sorting, tooltips, and comprehensive visual polish implemented. Stage 11 documented: High-Quality Image Serving with WASM Conversion - a comprehensive plan for converting TIFF files to web-optimized WebP/PNG using wasm-vips in Cloudflare Workers with R2 caching. Ready to implement when needed. Next up: Mobile optimization and PWA features (Stage 12).

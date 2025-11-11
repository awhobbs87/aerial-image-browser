# 🏗️ Tasmania Aerial Photos - Complete Build Guide for Claude Code

**Single-File Development Guide | Start from Scratch | Version 1.0.0**

---

## 🎯 What You're Building

A modern web application for browsing Tasmania's aerial photography archives with:

- Cloudflare Workers API (TypeScript + Hono)
- React 18 frontend (TypeScript + Tailwind CSS v4)
- Interactive Leaflet maps
- R2 TIFF caching
- D1 user database
- Mobile-responsive design

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
npm install @tanstack/react-query @tanstack/react-router axios date-fns leaflet lucide-react react-leaflet

npm install -D @types/leaflet @testing-library/react @testing-library/jest-dom vitest jsdom postcss tailwindcss@next @tailwindcss/postcss prettier prettier-plugin-tailwindcss eslint-plugin-react-hooks

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

Update after each stage:

```markdown
- ✅ Stage 0: Repository Setup
- ✅ Stage 1: Project Foundation
- ✅ Stage 2: Core API
- 🔴 Stage 3: TIFF Caching
- 🔴 Stage 4: React Frontend
- 🔴 Stage 5: React Query
- 🔴 Stage 6: Maps
- 🔴 Stage 7: Filtering
- 🔴 Stage 8: Favorites
- 🔴 Stage 9: Mobile
- 🔴 Stage 10: Production

**Notes:**

- Stage 1 took X hours
- Challenges: [list]
- Next: Start Stage 3
```

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

## 🚀 Next Steps

1. Complete Stage 0 (repository setup)
2. Work through Stage 1 (foundation)
3. Build Stage 2 (API)
4. Continue with remaining stages

For detailed instructions on Stages 3-10, refer to the full BUILD_WITH_CLAUDE_CODE.md guide or ask Claude Code to generate the next stage based on your progress.

---

**Version:** 1.0.0  
**Last Updated:** 2024-11-11  
**Status:** Ready to Start

🎉 **You're ready to build!** Start with Stage 0.

# Next Session Prompt

**Copy this prompt to start the next Claude Code session:**

---

I'm continuing work on the Tasmania Aerial Browser project.

## Current Status

- ✅ Stage 0 & 1 complete (repo setup, foundation, all Cloudflare resources created)
- ✅ Worker deployed at https://tas-aerial-browser.awhobbs.workers.dev
- ✅ Health check endpoint confirms all bindings working (D1, KV, R2)
- ✅ All infrastructure verified and operational

## Cloudflare Resources

- **Account ID:** `7330403de4c2446fd5f3cc58548a9cd4`
- **KV Namespace:** `6b0c54bb697d44c5b8dd97f02141bfdf`
- **D1 Database:** `f71d5cc3-1fc3-4888-94bd-e73b02a4823f` (tas-browser)
- **R2 Buckets:** tas-aerial-browser-tiffs, tas-aerial-browser-thumbnails

## Next Tasks

### 1. Build Stage 2 (Core API) - Following guide.md lines 452-785

Implement the complete API structure:
- Create TypeScript types in `src/types/index.ts` (Bindings, PhotoAttributes, EnhancedPhoto)
- Build ArcGIS client in `src/lib/arcgis.ts` (query by point, query by bounds, get layers)
- Implement Cache manager in `src/lib/cache.ts` (KV get/set with TTL)
- Implement R2 manager in `src/lib/r2.ts` (check TIFF/thumbnail existence)
- Create API routes in `src/routes/api.ts`:
  - `GET /api/layers` - Get available layers
  - `GET /api/search/location?lat=X&lon=Y&layers=0,1,2` - Search by point
  - `GET /api/search/bounds?west=X&south=Y&east=Z&north=W&layers=0,1,2` - Search by bbox
- Update main worker in `src/index.ts` with Hono, CORS, and route integration
- Deploy and test with: `curl http://localhost:8787/api/layers`

### 2. Build Stage 3 (TIFF Caching & Testing)

Create image proxying and caching:
- Build TIFF proxy endpoint: `GET /api/tiff/:layerId/:imageName`
  - Download from ArcGIS DOWNLOAD_LINK
  - Store in R2 TIFF_STORAGE bucket
  - Return cached version on subsequent requests
- Build thumbnail endpoint: `GET /api/thumbnail/:layerId/:imageName`
  - Download from ArcGIS THUMBNAIL_LINK
  - Store in R2 THUMBNAIL_STORAGE bucket
  - Return cached version on subsequent requests
- Test with real Tasmania coordinates:
  - Hobart: lat=-42.8821, lon=147.3272
  - Launceston: lat=-41.4419, lon=147.1448
- Verify R2 storage working and caching properly
- Check KV cache hit rates

### 3. Start Stage 4 (Frontend Foundation)

Build basic React interface:
- Create API client in `frontend/src/lib/apiClient.ts`:
  - Axios instance with worker base URL (https://tas-aerial-browser.awhobbs.workers.dev)
  - Type-safe functions for each API endpoint
  - Shared types from backend
- Build React components:
  - `SearchBar.tsx` - Coordinate input and search trigger
  - `PhotoCard.tsx` - Display photo metadata (name, date, scale, layer type)
  - `PhotoGrid.tsx` - Display search results in grid
  - `LoadingSpinner.tsx` - Loading states
- Update `App.tsx`:
  - Header with search bar
  - Results grid with photo cards
  - Basic Tailwind styling
- Test locally: `npm run dev:all` (runs both worker and frontend)

## Testing Requirements

After each stage, verify:
- Stage 2: API endpoints return correct data, CORS working, error handling functional
- Stage 3: TIFFs/thumbnails download and cache, R2 storage working, no duplicate downloads
- Stage 4: Frontend can search and display results, API integration working

## Important Notes

- Follow guide.md structure (lines 452-989 for detailed implementation)
- Test thoroughly at each step with real Tasmania data
- Use conventional commit format (enforced by git hooks)
- Deploy and test in production after each stage
- Update guide.md progress tracking as you complete stages

**Please follow the guide.md structure and test thoroughly at each step. Let's start with Stage 2.**

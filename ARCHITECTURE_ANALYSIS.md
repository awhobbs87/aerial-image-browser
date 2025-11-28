# Aerial Image Browser - Comprehensive Architecture Analysis

## 1. PROJECT OVERVIEW

**Project Structure:**
- **Frontend**: React 19 + TypeScript (Vite)
- **Backend**: Cloudflare Workers (Hono framework)
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2 (object storage for TIFFs/thumbnails)
- **Cache**: Cloudflare KV (key-value cache)
- **Data Source**: ArcGIS REST API (Tasmania aerial photo layers)
- **Map Library**: Leaflet with react-leaflet
- **UI Framework**: Material-UI (MUI)
- **State Management**: TanStack React Query (for server state), React hooks (for local state)

**Version**: 2.6.0

---

## 2. FRONTEND/BACKEND ARCHITECTURE

### Architecture Diagram:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ App.tsx (Main component)                                         │  │
│  │ - State: searchParams, filters, selectedPhoto, favorites         │  │
│  │ - View modes: grid | map | timeline | gallery                   │  │
│  │                                                                   │  │
│  │ ┌─ SearchBar ──────────────┐ ┌─ MapView ─────────────┐         │  │
│  │ │ • Autocomplete search     │ │ • Leaflet map         │         │  │
│  │ │ • Geocoding (Nominatim)   │ │ • Photo markers       │         │  │
│  │ │ • Search history          │ │ • Click to search     │         │  │
│  │ │ • "Near Me" geolocation   │ │ • Draw search center  │         │  │
│  │ └───────────────────────────┘ └───────────────────────┘         │  │
│  │                                                                   │  │
│  │ ┌─ FilterPanel ─────────────┐ ┌─ Results Views ───────┐         │  │
│  │ │ • Date range filter       │ │ • PhotoGrid           │         │  │
│  │ │ • Scale filter            │ │ • PhotoTimeline       │         │  │
│  │ │ • Layer type toggle       │ │ • PhotoGallery        │         │  │
│  │ │ • Quick presets           │ │ • Pagination & sort   │         │  │
│  │ └───────────────────────────┘ └───────────────────────┘         │  │
│  │                                                                   │  │
│  │ ┌─ PhotoMarkers (Map Overlay) ───────────────────────┐          │  │
│  │ │ • Polygon footprints for each photo               │          │  │
│  │ │ • Hover/select styling                            │          │  │
│  │ │ • Click to view details                           │          │  │
│  │ └───────────────────────────────────────────────────┘          │  │
│  │                                                                   │  │
│  │ Query Client: TanStack React Query                               │  │
│  │ - useSearchLocation hook (cached photo search results)           │  │
│  │ - useLayers hook (cached layer metadata)                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                      API Calls (Axios)
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Cloudflare Workers)                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ Hono Framework (Lightweight REST API)                            │  │
│  │                                                                   │  │
│  │ Routes:                                                           │  │
│  │ • GET /api/layers                - Get metadata for layers       │  │
│  │ • GET /api/search/location       - Query photos by point         │  │
│  │ • GET /api/search/bounds         - Query photos by bbox          │  │
│  │ • GET /api/tiff/{id}/{name}      - Proxy TIFF download           │  │
│  │ • GET /api/thumbnail/{id}/{name} - Proxy thumbnail              │  │
│  │ • GET /api/webp/{id}/{name}      - Convert TIFF to WebP          │  │
│  │ • GET /api/image/{id}/{name}     - Optimized images              │  │
│  │ • POST /api/convert-tiff-upload  - Server-side conversion        │  │
│  │                                                                   │  │
│  │ ┌─ ArcGISClient ──────────────────────────────────┐             │  │
│  │ │ • queryByPoint(layerId, lon, lat)               │             │  │
│  │ │ • queryByBounds(layerId, west, south, etc.)     │             │  │
│  │ │ • getLayers()                                    │             │  │
│  │ └──────────────────────────────────────────────────┘             │  │
│  │                                                                   │  │
│  │ ┌─ CacheManager ──────────────────────────────────┐             │  │
│  │ │ • KV cache for layer metadata                   │             │  │
│  │ └──────────────────────────────────────────────────┘             │  │
│  │                                                                   │  │
│  │ ┌─ R2Manager ─────────────────────────────────────┐             │  │
│  │ │ • Proxy TIFF files from R2                      │             │  │
│  │ │ • Cache thumbnails                              │             │  │
│  │ │ • Store WebP conversions                        │             │  │
│  │ └──────────────────────────────────────────────────┘             │  │
│  │                                                                   │  │
│  │ ┌─ Image Conversion ──────────────────────────────┐             │  │
│  │ │ • TIFF to WebP conversion                       │             │  │
│  │ │ • Image optimization                            │             │  │
│  │ └──────────────────────────────────────────────────┘             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                   ArcGIS API Calls, R2 Storage, KV Cache
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                                    │
│ • ArcGIS REST API (Tasmania aerial photos layers)                       │
│ • Nominatim API (OpenStreetMap - Reverse geocoding)                     │
│ • Cloudflare R2 (Object storage)                                         │
│ • Cloudflare KV (Distributed cache)                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. SEARCH FUNCTIONALITY FLOW

### 3.1 User Search Initiation
**Component**: `SearchBar.tsx`

**How it works:**
1. **Location Input**: User types in autocomplete field
2. **Geocoding**: As user types (>2 chars), fetches suggestions from Nominatim API
3. **Search History**: Shows recent searches and preset locations
4. **Selection**: User selects a location from suggestions

**Key Functions:**
- `geocodingService.searchLocations(query)` - Returns `SearchSuggestion[]`
- `geocodingService.getCurrentLocation()` - Browser geolocation API
- `geocodingService.reverseGeocode(lat, lon)` - Get address from coordinates
- `searchHistory.addSearch()` - Store search in localStorage

**Props to Parent:**
```typescript
onSearch: (lat: number, lon: number, locationName?: string) => void
```

### 3.2 Photo Search from API
**Component**: `App.tsx` → `useSearchLocation` hook

**When triggered:**
1. User completes search (selects location or clicks map)
2. `handleSearch()` callback in App.tsx:
   - Converts filter settings to API params
   - Calls `setSearchParams()` with `LocationSearchParams`

**API Call Flow:**
```typescript
LocationSearchParams {
  lat: number
  lon: number
  layers: [0, 1, 2]  // aerial, ortho, digital
  startDate?: ISO string
  endDate?: ISO string
  imageTypes?: ["aerial" | "ortho" | "digital"]
  minScale?: number
  maxScale?: number
}
  ↓
apiClient.searchByLocation(params)
  ↓
GET /api/search/location?lat=X&lon=Y&layers=0,1,2&...
  ↓
Backend:
  - ArcGISClient.queryByPoint(layerId, lon, lat) for each layer
  - applyFilters() for client-side exact matching
  - Sort by date (newest first)
  ↓
SearchLocationResponse {
  count: number
  photos: EnhancedPhoto[]
}
```

### 3.3 Location Data Flow Details

**LocationSearchParams Interface:**
```typescript
export interface LocationSearchParams extends FilterParams {
  lat: number
  lon: number
  layers?: number[]  // [0, 1, 2] for all layers
}

export interface FilterParams {
  startDate?: string  // ISO date
  endDate?: string    // ISO date
  minScale?: number
  maxScale?: number
  imageTypes?: string[]  // ["aerial", "ortho", "digital"]
}
```

**EnhancedPhoto (Result) Interface:**
```typescript
export interface EnhancedPhoto extends PhotoAttributes {
  // From ArcGIS attributes
  OBJECTID: number
  IMAGE_NAME: string
  FLY_DATE?: number
  FLY_SEASON?: string
  SCALE?: number
  RESOLUTION?: number
  IMAGE_TYPE?: string
  DOWNLOAD_LINK?: string
  THUMBNAIL_LINK?: string
  geometry: {
    rings: [[[lon, lat], [lon, lat], ...]]  // Polygon footprint
  }
  
  // Enhanced fields
  layerId: number  // 0, 1, or 2
  layerType: "aerial" | "ortho" | "digital"
  dateFormatted: string | null
  scaleFormatted: string | null
  cached: boolean
  thumbnailCached: boolean
}
```

**Search History (localStorage):**
- Key: `tas-aerial-search-history`
- Stores: `SearchHistoryItem[]`
```typescript
{
  id: string (UUID)
  query: string
  lat: number
  lon: number
  timestamp: number
}
```

---

## 4. MAP IMPLEMENTATION

### 4.1 Map Library Stack
- **Library**: Leaflet + react-leaflet
- **Tiles**: Esri World Imagery (satellite)
- **Components**: MapContainer, TileLayer, Marker, Polygon, Popup

### 4.2 MapView Component Structure

**File**: `MapView.tsx`

**Props:**
```typescript
interface MapViewProps {
  photos: EnhancedPhoto[]  // Photo markers to display
  onMapClick?: (lat: number, lon: number) => void  // NEW SEARCH
  onPhotoClick?: (photo: EnhancedPhoto) => void
  selectedPhoto?: EnhancedPhoto | null  // Highlighted polygon
  hoveredPhoto?: EnhancedPhoto | null   // Hover state
  searchCenter?: [number, number] | null  // Search location marker
  center?: [number, number]  // Initial map center
  zoom?: number
  autoZoom?: boolean  // Auto-fit bounds to photos
}
```

**Sub-components:**

1. **MapEventHandler**
   - Listens for map clicks
   - Triggers: `onMapClick(lat, lon)`
   - This initiates a NEW SEARCH at clicked location

2. **MapController**
   - Handles auto-zoom and centering
   - On new search: centers map at `searchCenter` with zoom 13
   - On initial load: fits bounds to all photo footprints
   - Uses Leaflet `LatLngBounds`

3. **PhotoMarkers**
   - Renders polygon footprints for each photo
   - Each photo has `geometry.rings[0]` (polygon coordinates)
   - Coordinates in ArcGIS format: `[lon, lat]`
   - Converted to Leaflet format: `[lat, lon]`

### 4.3 PhotoMarkers Component

**File**: `PhotoMarkers.tsx`

**Rendering Logic:**
- Max 100 polygons for performance
- Prioritizes: selected > hovered > others
- Polygons initially invisible (weight: 0, opacity: 0)
- On hover: blue outline, weight 2, opacity 0.6
- When selected: gold outline, weight 2, opacity 1

**Styling:**
```javascript
LAYER_COLORS = {
  aerial: { color: '#4c51bf', ... },
  ortho: { color: '#2f855a', ... },
  digital: { color: '#c53030', ... }
}

HOVER_STYLE = {
  color: '#3b82f6',      // Blue
  fillColor: '#60a5fa',
  fillOpacity: 0.15
}

SELECTED_STYLE = {
  color: '#d69e2e',      // Gold
  fillColor: '#ecc94b',
  fillOpacity: 0.08
}
```

**Interactions:**
- Click polygon → `onPhotoClick(photo)` → view details
- Polygon popup → thumbnail, metadata, "View Details" button

### 4.4 Zoom Controls
**File**: `MapZoomControls.tsx`
- Mobile-specific zoom buttons (+ and -)
- "Search Here" button to recenter

---

## 5. SEARCH AND RESULTS FLOW

### 5.1 Complete User Interaction Flow

```
USER STARTS APP
  ↓
  [SearchBar visible, empty map]
  
USER ENTERS LOCATION
  ↓
  Autocomplete fetches from Nominatim
  ↓
USER SELECTS LOCATION
  ↓
  handleSearch(lat, lon, locationName)
    - Prepares LocationSearchParams
    - setSearchParams() triggers useSearchLocation query
    - setSearchCenter([lat, lon])
  ↓
  API CALL: GET /api/search/location?lat=X&lon=Y&...
    - ArcGIS queries all layers for features at point
    - Backend filters by date/scale/type
    - Returns EnhancedPhoto[]
  ↓
  Results displayed in sidebar:
    - PhotoGrid (paginated thumbnails)
    - PhotoTimeline (chronological)
    - PhotoGallery (full-screen viewer)
  ↓
  Map updates:
    - MapController centers on searchCenter
    - PhotoMarkers renders polygon footprints
  ↓
USER INTERACTS WITH RESULTS:
  
  A) HOVER PHOTO IN GRID
     → onPhotoHover(photo)
     → PhotoMarkers highlights polygon with blue
     
  B) CLICK "SHOW ON MAP" / THUMBNAIL
     → handlePhotoSelect(photo)
     → setSelectedPhoto(photo)
     → setViewMode("map")
     → PhotoMarkers highlights polygon with gold
     → Map may need to zoom/pan to see it
     
  C) CLICK MAP ANYWHERE
     → MapEventHandler captures click
     → onMapClick(lat, lon)
     → NEW SEARCH initiated
     → Cycle repeats from "API CALL"
     
  D) CLICK POLYGON ON MAP
     → onPhotoClick(photo)
     → setSelectedPhoto(photo)
     → Sidebar scrolls to show this photo
     → Opens popup with thumbnail and details
```

### 5.2 Filtering & Results Updates

**Client-side Filters:**
```typescript
interface Filters {
  startDate: Date | null
  endDate: Date | null
  selectedScales: number[]
  layerTypes: {
    aerial: boolean
    ortho: boolean
    digital: boolean
  }
}
```

**Filter Application:**
1. User adjusts filters
2. `setFilters()` in App.tsx
3. `filteredPhotos` memo recalculates
4. Results display updates instantly (client-side)
5. When search again, sends filters to API

**API Parameters Sent:**
```typescript
{
  startDate: filters.startDate?.toISOString()  // Passed to API
  endDate: filters.endDate?.toISOString()      // Passed to API
  imageTypes: ["aerial", "ortho", "digital"]   // Passed to API
  minScale: Math.min(...selectedScales)        // Passed to API
  maxScale: Math.max(...selectedScales)        // Passed to API
}

// Server-side filtering in backend:
// - ArcGIS returns all photos at point
// - Backend applies filters with applyFilters()
// - Client-side exact matching for scale (if multiple selected)
```

---

## 6. CURRENT MAP INTERACTION CAPABILITIES

### 6.1 User Actions

1. **Click on Map**
   - Triggers new search at that location
   - Handler: `MapEventHandler` → `onMapClick` → `handleMapClick`
   - Calls: `handleSearch(lat, lon)`

2. **Click Photo Polygon**
   - Brings up popup with:
     - Thumbnail image
     - Photo name
     - Date, scale, type
     - "View Details" button
   - Handler: `PhotoMarkers` → `onPhotoClick` → `setSelectedPhoto`

3. **Hover Photo in Grid**
   - Polygon highlighted in blue on map
   - Both map and grid stay in sync

4. **Select Photo in Grid**
   - Polygon highlighted in gold on map
   - Auto-switches to map view

5. **Zoom/Pan Controls**
   - Mouse scroll zoom
   - Mobile: + / - buttons
   - "Search Here" button

### 6.2 Current Limitations (for Pin-Drop Feature)

**Existing Capabilities:**
- ✓ Click map to search at location (point query)
- ✓ View polygon footprints
- ✓ Hover to highlight
- ✓ Popup on polygon click
- ✓ Auto-zoom to fit photos

**Missing for Pin-Drop Feature:**
- ✗ Visual indicator for dropped pin (temporary marker)
- ✗ Draw mode to select custom location before searching
- ✗ Show coordinates of clicked point
- ✗ Way to cancel/modify clicked point before searching
- ✗ Leaflet-draw integration (has types but not used)
- ✗ Multiple pins support
- ✗ Pin history/management

---

## 7. STATE MANAGEMENT ARCHITECTURE

### 7.1 Global State (React Hooks)
```typescript
// App.tsx state
const [searchParams, setSearchParams] = useState<LocationSearchParams | null>(null)
const [filters, setFilters] = useState<Filters>({...})
const [selectedPhoto, setSelectedPhoto] = useState<EnhancedPhoto | null>(null)
const [hoveredPhoto, setHoveredPhoto] = useState<EnhancedPhoto | null>(null)
const [searchCenter, setSearchCenter] = useState<[number, number] | null>(null)
const [viewMode, setViewMode] = useState<ViewMode>("grid" | "map")
const [resultsViewMode, setResultsViewMode] = useState<ResultsViewMode>("grid" | "timeline" | "gallery")
const [favorites, setFavorites] = useState<Set<string>>(new Set())
const [comparisonSelection, setComparisonSelection] = useState<EnhancedPhoto[]>([])
```

### 7.2 Server State (React Query)
```typescript
// useSearchLocation hook
const { data, isLoading, error } = useQuery({
  queryKey: ["photos", "location", params],
  queryFn: () => apiClient.searchByLocation(params!),
  enabled: params !== null && !isNaN(params.lat) && !isNaN(params.lon),
  staleTime: 5 minutes
})

// data structure:
{
  photos: EnhancedPhoto[]
  count: number
}
```

### 7.3 Derived State
```typescript
const filteredPhotos = useMemo(() => {
  // Apply client-side filters to data.photos
}, [data?.photos, filters])

const mapPhotos = useMemo(() => {
  // Prioritize visible grid photos, then add others
  // For map synchronization
}, [visibleGridPhotos, filteredPhotos])

const availableScales = useMemo(() => {
  // Extract unique scales from photos
}, [data?.photos])
```

### 7.4 Persistence
- **Search History**: localStorage (via `searchHistory.ts`)
- **Theme Preference**: localStorage (`themeMode`)
- **Favorites**: React state (in-memory, not persisted)

---

## 8. API ENDPOINTS & PARAMETERS

### 8.1 Search Endpoints

**Location Search (Point Query)**
```
GET /api/search/location?lat=X&lon=Y&layers=0,1,2&startDate=ISO&endDate=ISO&imageTypes=aerial,ortho&minScale=NUM&maxScale=NUM

Parameters:
- lat (required): latitude
- lon (required): longitude
- layers (default "0,1,2"): comma-separated layer IDs
- startDate (optional): ISO 8601 date
- endDate (optional): ISO 8601 date
- imageTypes (optional): comma-separated types (aerial, ortho, digital)
- minScale (optional): minimum scale (1:minScale)
- maxScale (optional): maximum scale (1:maxScale)

Response:
{
  success: boolean
  data: {
    count: number
    photos: EnhancedPhoto[]
  }
}
```

**Bounds Search (Bounding Box Query)**
```
GET /api/search/bounds?west=X&south=Y&east=Z&north=W&layers=0,1,2&...

Parameters:
- west, south, east, north (all required): bounding box coordinates
- layers, startDate, endDate, imageTypes, minScale, maxScale: same as location search
```

### 8.2 Image Endpoints

```
GET /api/thumbnail/{layerId}/{imageName}
  - Returns thumbnail for PhotoCard display

GET /api/tiff/{layerId}/{imageName}
  - Returns full TIFF file (proxied from R2)

GET /api/webp/{layerId}/{imageName}
  - Returns WebP conversion of TIFF (cached in R2)

GET /api/image/{layerId}/{imageName}?width=W&height=H&quality=Q&format=FMT
  - Optimized image with Cloudflare Image Resizing
  - Formats: auto, webp, jpeg, png
```

### 8.3 Metadata Endpoints

```
GET /api/layers
  - Returns layer metadata
  - Cached in KV for 1 hour

GET /health
  - Health check endpoint
```

---

## 9. DATA FLOW DIAGRAM: FROM CLICK TO RESULTS

```
USER CLICKS MAP AT (lat: -42.5, lon: 147.2)
  ↓
MapEventHandler.onClick(LatLng)
  ↓
onMapClick(-42.5, 147.2)
  ↓
handleMapClick called in App.tsx
  ↓
handleSearch(-42.5, 147.2)
  ↓
Build LocationSearchParams:
  {
    lat: -42.5,
    lon: 147.2,
    layers: [0, 1, 2],
    imageTypes: ["aerial", "ortho"] if digital disabled,
    startDate: "2010-01-01T00:00:00.000Z" if date filtered,
    minScale: 1000,
    maxScale: 10000 if scale filtered,
  }
  ↓
setSearchParams(params)
  ↓
useSearchLocation hook triggered
  ↓
apiClient.searchByLocation(params)
  ↓
HTTP GET /api/search/location?lat=-42.5&lon=147.2&layers=0,1,2&...
  ↓
[BACKEND]
  ArcGISClient.queryByPoint(0, 147.2, -42.5)  // Layer 0 (aerial)
  ArcGISClient.queryByPoint(1, 147.2, -42.5)  // Layer 1 (ortho)
  ArcGISClient.queryByPoint(2, 147.2, -42.5)  // Layer 2 (digital)
  
  → Fetch features from ArcGIS
  → Transform to EnhancedPhoto
  → Apply filters (date, scale, type)
  → Sort by FLY_DATE descending
  
  Return: {
    success: true,
    data: {
      count: 47,
      photos: [
        {
          OBJECTID: 12345,
          IMAGE_NAME: "tas_2015_0045.tif",
          FLY_DATE: 1420070400000,
          SCALE: 5000,
          layerId: 0,
          layerType: "aerial",
          dateFormatted: "1 January 2015",
          geometry: {
            rings: [[[147.19, -42.50], [147.21, -42.50], ...]]
          },
          ...
        },
        ...
      ]
    }
  }
  ↓
[FRONTEND]
React Query caches response
Data available in: data.photos
  ↓
Computed filteredPhotos:
  - Apply date filters
  - Apply scale filters
  - Apply type filters
  ↓
Results rendered:
  
  SIDEBAR:
  - PhotoGrid shows 12 photos per page
  - PhotoTimeline shows chronological view
  - Each photo card shows thumbnail + metadata
  
  MAP:
  - MapController fits bounds to photos
  - PhotoMarkers renders 100 polygons (prioritized)
  - Search center shows as blue marker
  ↓
USER INTERACTS:
  - Hover grid photo → map polygon highlights blue
  - Click grid "Show on Map" → switches to map view, selects photo
  - Click map polygon → opens popup with details
  - Click map elsewhere → new search at that location
```

---

## 10. KEY FILES REFERENCE

### Frontend

**Core Application**
- `/frontend/src/App.tsx` - Main app component, state management, layout
- `/frontend/src/main.tsx` - Entry point
- `/frontend/src/types/api.ts` - TypeScript interfaces for API types
- `/frontend/src/theme.ts` - Theme configuration (light/dark mode)

**Components**
- `/frontend/src/components/MapView.tsx` - Map container
- `/frontend/src/components/PhotoMarkers.tsx` - Map polygon markers
- `/frontend/src/components/SearchBar.tsx` - Location search input
- `/frontend/src/components/PhotoGrid.tsx` - Photo results grid
- `/frontend/src/components/PhotoCard.tsx` - Individual photo card
- `/frontend/src/components/FilterPanel.tsx` - Filter controls
- `/frontend/src/components/PhotoTimeline.tsx` - Timeline view
- `/frontend/src/components/PhotoGallery.tsx` - Full-screen gallery
- `/frontend/src/components/MapZoomControls.tsx` - Zoom button controls

**Services & Utilities**
- `/frontend/src/lib/apiClient.ts` - API client, endpoints, URL builders
- `/frontend/src/lib/geocoding.ts` - Nominatim geocoding service
- `/frontend/src/lib/searchHistory.ts` - Search history persistence
- `/frontend/src/lib/leafletConfig.ts` - Leaflet marker icon setup
- `/frontend/src/hooks/usePhotos.ts` - React Query hooks for data fetching

### Backend

**API Routes**
- `/src/routes/api.ts` - All API endpoints and logic
- `/src/index.ts` - Hono app setup, CORS config

**Utilities**
- `/src/lib/arcgis.ts` - ArcGIS API client
- `/src/lib/cache.ts` - Cloudflare KV caching
- `/src/lib/r2.ts` - Cloudflare R2 storage management
- `/src/lib/imageConversion.ts` - TIFF to WebP conversion

**Types**
- `/src/types/index.ts` - TypeScript types for backend

---

## 11. DESIGN PATTERNS & BEST PRACTICES

### 11.1 React Patterns
- **Lazy Loading**: MapView component lazy-loaded for performance
- **Memoization**: useMemo for expensive calculations (filteredPhotos, mapPhotos)
- **Component Composition**: Small, focused components (PhotoCard, PhotoMarkers)
- **Custom Hooks**: useSearchLocation for data fetching
- **Event Handlers**: Callback props for parent-child communication

### 11.2 Performance Optimizations
- **React Query Caching**: 10-minute stale time, 60-minute cache
- **Pagination**: 12 photos per page to limit DOM nodes
- **Polygon Limit**: Max 100 polygons on map (prioritized)
- **Lazy Image Loading**: `react-window` for virtualized grids
- **Web Workers**: TIFF processing offloaded to workers

### 11.3 API Design
- **REST Conventions**: GET for queries, clear parameter naming
- **Filtering**: Server-side broad filters, client-side exact filters
- **Caching**: Multi-level (KV for metadata, R2 for assets, HTTP cache for images)
- **CORS**: Permissive CORS for public API

---

## 12. COORDINATE SYSTEMS & TRANSFORMATIONS

### Coordinate Handling
1. **User Input**: Lat/Lon from Nominatim API
2. **API Parameters**: Lon/Lat (GeoJSON standard) for ArcGIS
3. **ArcGIS Response**: Rings in [lon, lat] format
4. **Map Display**: Leaflet uses [lat, lon] format
5. **Storage**: Coordinates in FLY_DATE as milliseconds timestamp

**Example Transformation:**
```typescript
// User searches for Hobart
// Nominatim returns: lat: -42.8821, lon: 147.3272

// Send to API
{
  lat: -42.8821,
  lon: 147.3272,
  ...
}

// Backend calls ArcGIS
queryByPoint(layerId, 147.3272, -42.8821)  // lon, lat

// ArcGIS returns polygons
geometry.rings = [[[147.32, -42.88], [147.33, -42.88], ...]]  // lon, lat

// Convert for Leaflet
positions = [[-42.88, 147.32], [-42.88, 147.33], ...]  // lat, lon

// Render Polygon
<Polygon positions={positions} />
```

---

## 13. CRITICAL INFORMATION FOR PIN-DROP FEATURE

### What Exists Today
1. **Click to Search**: Full flow from map click to results
2. **Search Center Marker**: Blue marker showing search point
3. **Photo Polygons**: Rendered on map with interactions
4. **Coordinate System**: Proper handling of lat/lon conversions
5. **API Parameters**: Already built for custom coordinates

### Integration Points for Pin-Drop

**Needed Modifications:**
1. **New State**: `droppedPin: [lat, lon] | null`
2. **New UI**: Pin marker component, cancel/confirm buttons
3. **Map Interaction Mode**: Toggle between "search" and "pin-drop" modes
4. **Draw Tools**: Optional - use leaflet-draw (types already included)
5. **Result Binding**: Pin coordinates → search parameters

**Key Hooks to Use:**
- `MapEventHandler.onMapClick` - Already captures clicks
- `setSearchParams` - Already triggers API call
- `PhotoMarkers` rendering - Already shows footprints
- Filter state - Already applied

**No Backend Changes Needed**: All necessary API parameters already exist


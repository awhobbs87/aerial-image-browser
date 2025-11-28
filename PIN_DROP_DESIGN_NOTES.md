# Pin-Drop Feature Design Notes

Based on comprehensive analysis of the Aerial Image Browser architecture, here are the key insights for implementing a pin-drop feature.

## Current System Behavior

### Search Flow Today
1. User clicks on map at coordinates (lat, lon)
2. `MapEventHandler` immediately triggers `onMapClick(lat, lon)`
3. `handleMapClick()` in App.tsx calls `handleSearch(lat, lon)` 
4. Instantly searches API and displays results
5. Search center marker appears on map

**Key Finding**: The system already supports clicking to search - it's instantaneous!

## Pin-Drop Feature Design Options

### Option 1: Confirm-Before-Search (Recommended for UX)
Users want to see the pin location before triggering an expensive API search.

**Implementation**:
```typescript
// Add to App.tsx state
const [pendingPin, setPendingPin] = useState<[number, number] | null>(null)

// Modify handleMapClick
const handleMapClick = useCallback((lat: number, lon: number) => {
  setPendingPin([lat, lon])  // Show pin, pause search
  // Don't call handleSearch yet
}, [])

// New handler for confirming the pin
const handleConfirmPin = useCallback(() => {
  if (pendingPin) {
    handleSearch(pendingPin[0], pendingPin[1])
    setPendingPin(null)
  }
}, [pendingPin, handleSearch])

// New handler for canceling
const handleCancelPin = useCallback(() => {
  setPendingPin(null)
}, [])
```

**Map UI Changes**:
1. Show temporary marker/circle at clicked coordinates
2. Display coordinate badge: "42.5°S, 147.2°E"
3. Add "Search Here" and "Cancel" buttons
4. Marker different color from searchCenter (maybe red/orange vs blue)

**Components to Create**:
- `PendingPinMarker.tsx` - Render the temporary pin with styling
- `PinCoordinateDisplay.tsx` - Show coordinates and action buttons

**Styling**:
```javascript
// Pending pin (user clicking to explore)
const PENDING_PIN_COLOR = '#ef4444'  // Red
const PENDING_PIN_RADIUS = 15

// Search center (current active search)
const SEARCH_CENTER_COLOR = '#3b82f6'  // Blue
```

### Option 2: Automatic Search (Current Behavior)
No change needed - clicking map already searches immediately. Pin is just the search center marker.

**Pros**: No extra implementation
**Cons**: No feedback loop, can't explore without searching

### Option 3: Hybrid - Toggle Mode
Allow users to switch between "instant search" and "confirm search" modes.

```typescript
const [pinMode, setPinMode] = useState<'instant' | 'confirm'>('confirm')

const handleMapClick = useCallback((lat: number, lon: number) => {
  if (pinMode === 'instant') {
    handleSearch(lat, lon)
  } else {
    setPendingPin([lat, lon])
  }
}, [pinMode, handleSearch])
```

## Integration Points

### State Management
```typescript
// In App.tsx, alongside existing state:
const [pendingPin, setPendingPin] = useState<[number, number] | null>(null)
```

### Map Component Props
```typescript
interface MapViewProps {
  // ... existing props
  pendingPin?: [number, number] | null
  onConfirmPin?: (lat: number, lon: number) => void
  onCancelPin?: () => void
}
```

### PhotoMarkers Update
```typescript
// PhotoMarkers.tsx - No changes needed
// It already handles:
// - searchCenter (blue marker - existing search)
// - New pendingPin would be rendered as separate marker
```

### MapController Update
```typescript
// MapController.tsx
// On pendingPin set: center map on pin location
// On searchCenter set: center map on search center
// Don't auto-zoom until search is confirmed
```

## UI/UX Layout

### Map Overlay (Top-Right)
```
Current: Floating search box (collapse/expand)
Option: Add pin mode toggle next to search box

[Search box]
[Pin Mode: Instant | Confirm] ← Toggle button
```

### Pending Pin Feedback
```
When user clicks map and mode is "confirm":

1. Red/orange marker appears at click location
2. Coordinate badge near marker: "-42.5°, 147.2°"
3. Bottom toolbar appears with buttons:
   [Search Here] [Cancel]

Optional: Show distance/direction from current search center
```

## Data Flow Diagrams

### Confirm-Before-Search Flow
```
USER CLICKS MAP
  ↓
MapEventHandler.onClick(LatLng)
  ↓
onMapClick(lat, lon)
  ↓
IF pendingPin already exists:
  REPLACE pendingPin with new coordinates
ELSE:
  SET pendingPin = [lat, lon]
  ↓
UI updates:
  - PendingPinMarker rendered at pendingPin
  - Coordinate display shown
  - "Search Here" / "Cancel" buttons visible
  ↓
USER CLICKS "SEARCH HERE"
  ↓
handleConfirmPin()
  ↓
handleSearch(pendingPin[0], pendingPin[1])
  ↓
setPendingPin(null)
  ↓
[Existing search flow continues...]
```

### Cancel Flow
```
USER CLICKS "CANCEL"
  ↓
handleCancelPin()
  ↓
setPendingPin(null)
  ↓
PendingPinMarker disappears
Buttons disappear
Map returns to normal state
NO API CALL made
```

## File Changes Required

### Create New Files
- `/frontend/src/components/PendingPinMarker.tsx`
  - Renders red/orange marker with circle
  - Leaflet Marker component
  - Custom icon with pin styling

- `/frontend/src/components/PinActions.tsx` (Optional)
  - Coordinate display
  - Search/Cancel buttons
  - Positioned near pin or in map corner

### Modify Existing Files

**App.tsx**:
```typescript
// Add state
const [pendingPin, setPendingPin] = useState<[number, number] | null>(null)

// Add handlers
const handleConfirmPin = useCallback(() => { ... }, [])
const handleCancelPin = useCallback(() => { ... }, [])

// Pass to MapView
<MapView
  // ... existing props
  pendingPin={pendingPin}
  onConfirmPin={handleConfirmPin}
  onCancelPin={handleCancelPin}
/>
```

**MapView.tsx**:
```typescript
// Update props interface
interface MapViewProps {
  pendingPin?: [number, number] | null
  onConfirmPin?: (lat: number, lon: number) => void
  onCancelPin?: () => void
  // ... existing props
}

// Render pending pin
{pendingPin && <PendingPinMarker position={pendingPin} />}

// Handle confirm action button
<button onClick={() => onConfirmPin?.(pendingPin[0], pendingPin[1])}>
  Search Here
</button>
```

**MapEventHandler.tsx**:
```typescript
// No changes! This already captures clicks correctly
// Just Map.tsx above handles them differently based on mode
```

## Coordinate Display Format

```typescript
// Format coordinates nicely for display
function formatCoordinates(lat: number, lon: number): string {
  const latStr = Math.abs(lat).toFixed(4) + '° ' + (lat >= 0 ? 'N' : 'S')
  const lonStr = Math.abs(lon).toFixed(4) + '° ' + (lon >= 0 ? 'E' : 'W')
  return `${latStr}, ${lonStr}`
}

// Example output: "42.8821° S, 147.3272° E"
```

## Performance Considerations

**No Backend Impact**:
- Pin state is client-side only
- No API calls until confirmation
- Uses existing search infrastructure

**Frontend Impact**:
- Single additional state variable
- One extra marker render (minimal overhead)
- No additional queries or caching needed

**Memory**:
- `pendingPin` state: ~40 bytes
- PendingPinMarker component: ~5KB
- Negligible impact

## User Feedback Elements

### Visual Feedback
- Pin marker color (red/orange) distinguishes from search center (blue)
- Smooth animation when pin appears/moves
- Coordinate badge updates in real-time
- Button appears/disappears with pin

### Audio/Haptic (Optional)
- Soft click sound on pin drop
- Haptic feedback on mobile (vibrate)

### Error States
- If coordinates invalid: show error tooltip
- If coordinates out of bounds: message "Location outside Tasmania"

## Testing Strategy

### Unit Tests
```typescript
// components/__tests__/PendingPinMarker.test.tsx
- Marker renders at correct position
- Marker disappears when pin is null
- Click handlers fire correctly

// hooks test
- setState correctly updates pin
- Confirm handler calls search with right params
- Cancel handler clears pin
```

### Integration Tests
```typescript
// Full flow test
1. Click map → pendingPin state set
2. Button visible
3. Click "Search Here" → API call triggered
4. Results appear
5. Pin cleared from state
```

### Manual Testing
```
1. Open app, click map multiple times (pin should move)
2. Verify coordinates display correctly
3. Search → verify results appear
4. Cancel → verify state cleared
5. Search one location, then pin another → verify old search clears
```

## Accessibility Considerations

### Keyboard Navigation
- "Search Here" button must be keyboard accessible (Tab key)
- Enter key on "Search Here" button triggers search
- Escape key cancels pin

### Screen Readers
- Pending pin marker should have aria-label
- Coordinates should be announced
- Button labels should be clear: "Search at coordinates"

### Color Contrast
- Red pin marker on map background: sufficient contrast
- Coordinate text: sufficient contrast

## Future Extensions

### Multi-Pin Support
```typescript
const [pins, setPins] = useState<Array<{ id: string, lat: number, lon: number }>>([])

// Later: compare multiple locations
```

### Pin History
```typescript
const [pinHistory, setPinHistory] = useState<[number, number][]>([])

// Save pins user has interacted with
localStorage.setItem('pin-history', JSON.stringify(pinHistory))
```

### Drawing Tools
```
// Already has leaflet-draw types imported but not used
// Could implement:
// - Rectangle draw to search bounds
// - Polygon draw for custom areas
// - Line draw for transects
```

## API Compatibility

**Good News**: No API changes needed!

The existing `/api/search/location` endpoint already accepts:
- `lat`: any valid latitude
- `lon`: any valid longitude

This works for both:
1. Geocoded locations (from SearchBar)
2. Map-clicked pins (from pendingPin)
3. User-entered coordinates (future enhancement)

**No Backend Work Required**

---

## Recommended Implementation Path

### Phase 1: Basic Confirm-Before-Search (MVP)
1. Add `pendingPin` state to App.tsx
2. Modify `handleMapClick` to set pending pin instead of immediate search
3. Create `PendingPinMarker.tsx` component
4. Add action buttons to cancel or confirm
5. Implement `handleConfirmPin` callback

**Effort**: ~2-3 hours
**Risk**: Low - isolated state changes
**User Value**: High - clearer interaction model

### Phase 2: Polish
1. Coordinate display component
2. Smooth animations
3. Keyboard shortcuts (Escape to cancel)
4. Distance display to current search center

**Effort**: ~1-2 hours
**Risk**: Very low

### Phase 3: Advanced Features
1. Pin mode toggle (instant vs confirm)
2. Pin history sidebar
3. Drawing tools integration
4. Multi-pin comparison

**Effort**: ~4-6 hours each
**Risk**: Medium - more complex interactions
**Priority**: Lower - nice-to-have features

---

## Summary

The pin-drop feature fits naturally into the existing architecture. The main task is:

1. **Intercept the map click** (already works!)
2. **Add a confirmation step** (new state + UI)
3. **Show visual feedback** (temporary marker)
4. **Trigger search on confirmation** (existing search flow)

All the hard parts (API integration, coordinate handling, results display) already exist and work perfectly. The pin-drop is purely a UX enhancement that adds a pause between clicking and searching.


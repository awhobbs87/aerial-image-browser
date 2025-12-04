# Changelog

All notable changes to this project will be documented in this file.

## [2.9.2] - 2025-12-05

### Fixed

- **Then vs Now Button Visibility**: Fixed "Then vs Now" button not appearing on mobile in photo preview modal
  - Changed button layout from Stack to flex Box with wrapping enabled
  - Buttons now wrap properly on mobile screens ensuring all are visible
- **Removed Redundant Location Text**: Removed "Location: Available on map" text from photo metadata
  - Cleaner metadata display in photo preview modal
  - Location information is already evident from the map view

### Technical

- Updated `frontend/src/components/PhotoPreviewModal.tsx`:
  - Changed DialogActions button container from Stack to Box with `flexWrap: 'wrap'`
  - Removed geometry-based location display section
  - Removed unused `Place` icon import

## [2.9.1] - 2025-12-05

### Fixed

- **Mobile Pinch-to-Zoom Crashes**: Complete fix for pinch-to-zoom crashes in fullscreen photo viewer
  - Removed recursive zoom velocity algorithm that was causing feedback loops
  - Implemented non-recursive zoom handler with recursion prevention flag
  - Reduced zoom sensitivity to 1.1 (from 1.15) for much gentler mobile pinch control
  - Added `isHandlingZoom` flag to prevent cascading zoom events
  - Added animation constraint handler to prevent viewport from going off-screen
  - More conservative zoom settings: slower animations (0.5s), gentler spring (8), limited zoom speed (1.5/s)
  - Added strict viewport constraints: `maxZoomPixelRatio: 2.5`, `visibilityRatio: 1.0`
  - Prevents black screens and crashes from aggressive pinch gestures

### Technical

- Updated `frontend/src/components/OpenSeadragonViewer.tsx`:
  - Removed velocity tracking variables (`lastZoom`, `lastZoomTime`) that caused recursion
  - Simplified zoom handler to only clamp when necessary, using `requestAnimationFrame`
  - Added `viewer.addHandler("animation")` to continuously apply viewport constraints
  - Reduced `zoomPerClick` to 1.3, `zoomPerScroll` to 1.1, `zoomPerSecond` to 1.5
  - Increased `animationTime` to 0.5s and reduced `springStiffness` to 8

## [2.9.0] - 2025-12-05

### Added

- **Then vs Now Button in Fullscreen**: Added History button to fullscreen photo viewer
  - Button appears in control panel when viewing photos in fullscreen mode
  - Closes fullscreen and opens Then vs Now comparison modal with one click
  - Improves accessibility to comparison feature from fullscreen view

### Fixed

- **Mobile Pinch-to-Zoom**: Fixed excessive zoom speed and black screen crashes in fullscreen photo viewer
  - Reduced zoom sensitivity from 1.2 to 1.15 for smoother control
  - Added zoom velocity limiting (max 5.0 units/second) to prevent runaway zooming
  - Implemented intelligent zoom constraints based on image size
  - Prevents black screen crashes caused by extreme zoom levels
  - NOTE: This fix had issues and was replaced by the complete fix in v2.9.1
- **Image Refresh**: Fixed fullscreen viewer not updating when switching between different photos
  - Viewer now properly destroys and recreates OpenSeadragon instance on image URL change
  - Photo preview modal correctly displays new image when navigating between photos
- **Mobile Location Button**: Implemented actual GPS geolocation for "My Location" button
  - Button now uses device GPS to center map on user's current location
  - Added loading state with pulsing animation while fetching location
  - Graceful fallback to search center or Tasmania if location unavailable
  - Proper error handling for denied permissions or unsupported browsers

### Technical

- Updated `frontend/src/components/OpenSeadragonViewer.tsx`:
  - Added zoom velocity tracking and limiting algorithm
  - Added `onThenNowClick` prop and History button in controls
  - Fixed viewer re-initialization on imageUrl changes
- Updated `frontend/src/components/PhotoPreviewModal.tsx`:
  - Connected fullscreen viewer to ThenNowModal via `onThenNowClick` handler
  - Cleaned up unused `useConvertedImage` references
- Updated `frontend/src/components/MapZoomControls.tsx`:
  - Implemented `navigator.geolocation.getCurrentPosition()` API
  - Added `locatingUser` state with visual feedback
  - Enhanced error handling and fallback logic

## [2.8.0] - 2025-11-29

### Fixed

- **Mobile Welcome Screen**: Hidden welcome cards on mobile when no search is active
  - Map now displays immediately on mobile without welcome screen overlay
  - Welcome cards only show on desktop (md breakpoint and up)
  - Improves mobile user experience by removing visual clutter

## [2.7.0] - 2025-11-29

### Added

- **Pin-Drop Location Selection**: Click anywhere on the map to drop a pin, preview coordinates, then confirm to search
  - Visual red marker with pulsing circle animation shows selected location
  - Floating action buttons display coordinates and provide "Search Here" / "Cancel" options
  - Replaces instant search behavior for better control and prevents accidental API calls
- **Keyboard Shortcuts**: Press Escape key to cancel pending pin and remove marker
- **Mobile-First Map Layout**: Map now displays by default on mobile devices
  - Direct access to interactive map on app launch (no welcome screen)
  - Tap anywhere on map to drop pin and search
  - Better mobile user experience with immediate map interaction

### Changed

- **Search Behavior**: Map clicks now show pending pin instead of immediate search
  - User must confirm with "Search Here" button to trigger API call
  - Provides visual feedback and confirmation step for location selection
- **Mobile Layout**: Map visibility logic updated to show map by default on mobile
  - Display logic: show when !searchParams OR viewMode === "map"
  - MapView always renders (no conditional rendering based on searchParams)

### Improved

- **Search Control**: Two-step confirmation process prevents accidental searches from map exploration
- **Mobile UX**: Removed welcome screen barrier, immediate access to map functionality
- **Visual Feedback**: Clear coordinate display and action buttons for better user understanding

### Technical

- Created `frontend/src/components/PendingPinMarker.tsx` - Red marker with pulsing animation
- Created `frontend/src/components/PinActionButtons.tsx` - Floating action buttons with coordinates
- Created `frontend/src/lib/formatCoordinates.ts` - Coordinate formatting utility
- Updated `App.tsx` - Added pendingPin state, handlers, keyboard shortcuts, mobile layout logic
- Updated `MapView.tsx` - Added pendingPin, onConfirmPin, onCancelPin props
- Created `ARCHITECTURE_ANALYSIS.md` - Comprehensive project architecture documentation
- Created `PIN_DROP_DESIGN_NOTES.md` - Implementation design and rationale

## [2.6.0] - 2025-11-28

### Added

- **Web Worker TIFF Conversion**: Client-side TIFF to PNG/WebP conversion in background thread
  - Off-main-thread processing prevents UI blocking
  - **PNG format (default)**: Truly lossless, zero compression artifacts, absolute maximum quality
  - WebP format option: Good quality with smaller file size
  - Increased pixel budget from 20M to 100M pixels (allows ~10000x10000 images)
  - Progress reporting during conversion (10%, 30%, 50%, 70%, 90%, 100%)
  - Pixel-perfect rendering with disabled image smoothing
- **OpenSeadragon Integration**: Professional image viewer with intelligent zoom limits
  - Intelligent zoom limits based on image megapixels (prevents crashes/black screens)
  - Debounced zoom events (100ms) to prevent lag
  - Smooth animations and touch-optimized gestures
  - minPixelRatio 1.0 for crisp rendering at all zoom levels
- **R2 Caching for Client Conversions**: Automatically cache client-converted WebP to R2
  - Check R2 cache before converting (avoid redundant work)
  - Upload converted WebP to R2 for future users
  - New PUT /api/webp/:layerId/:imageName endpoint for cache uploads
  - Client-side conversions now benefit all users

### Changed

- Replaced react-zoom-pan-pinch with OpenSeadragon for better large image handling
- TIFF conversion now uses client-side Web Worker instead of external service
- **Switched to PNG format (default)** for truly lossless conversion (was WebP)
- Increased pixel budget from 50M to 100M pixels (~10000x10000 images)
- Disabled image smoothing in canvas for pixel-perfect rendering
- Zoom limits now calculated dynamically based on image size:
  - <1MP: max 20x zoom
  - 1-5MP: max 15x zoom
  - 5-15MP: max 10x zoom
  - 15-25MP: max 5x zoom
  - > 25MP: max 3x zoom
- OpenSeadragon quality settings optimized:
  - minPixelRatio 1.0 (1:1 pixel mapping)
  - blendTime 0 (instant sharpness, no blending)
  - alwaysBlend false (keeps sharp edges)
  - smoothTileEdgesMinZoom Infinity (disables smoothing)
  - immediateRender false (waits for high-quality tiles)

### Improved

- **Image Sharpness**: MAXIMUM quality with zero compromises
  - PNG format: Truly lossless, no compression artifacts whatsoever
  - Pixel-perfect rendering: imageSmoothingEnabled = false
  - 100M pixel budget: Supports ultra-high resolution images
  - 1:1 pixel mapping at all zoom levels
  - Zero tile blending or edge smoothing
  - Instant rendering of sharp tiles
- **Performance**: Conversion happens in background thread (no UI blocking)
- **Cache Efficiency**: Client-converted images shared via R2 cache

### Technical

- Created `frontend/src/workers/tiffConversion.worker.ts` for background TIFF conversion
- Created `frontend/src/hooks/useTiffConversion.ts` for worker lifecycle management
- Created `frontend/src/components/OpenSeadragonViewer.tsx` with intelligent zoom
- Updated `PhotoPreviewModal` to use new conversion pipeline
- Added R2 cache upload/check methods to apiClient

## [2.5.0] - 2025-11-28

### Added

- Intelligent search caching (5-minute cache for geocoding results)
- Immediate loading feedback when typing in search bar
- Better search result formatting (Google Maps style, removes duplicate Tasmania references)

### Changed

- Reduced debounce time from 300ms to 150ms for faster search responsiveness
- Optimized mobile UI with reduced padding across all components:
  - Sidebar padding reduced from 2/3 to 1.5/3 (mobile/desktop)
  - Button heights reduced from 48px to 40px on mobile
  - Margins and spacing reduced by 25% on mobile viewports
  - Toggle buttons more compact (reduced padding)
  - Welcome screen padding optimized for mobile
  - Photo grid controls more compact on mobile
  - Search bar action row padding reduced
- Mobile view toggle buttons now 25% smaller with tighter spacing
- Quick filter chips and buttons optimized for mobile touch targets

### Improved

- Search now shows loading state immediately when typing (no delay)
- Better error handling in geocoding service
- More efficient use of screen space on mobile devices
- Faster perceived performance with instant visual feedback
- Improved mobile one-handed usability with more compact controls

## [2.4.0] - 2025-11-25

### Added

- Professional zoom/pan image viewer with react-zoom-pan-pinch library:
  - Smooth zoom transitions with proper easing animations
  - Mouse wheel zoom at cursor position (not center)
  - Buttery smooth pinch-to-zoom on mobile devices
  - Double-tap to toggle zoom functionality
  - Panning with momentum/inertia for natural feel
  - Better touch gesture recognition on mobile

### Changed

- Replaced manual zoom/pan implementation (~155 lines) with react-zoom-pan-pinch library
- Improved PhotoPreviewModal zoom controls to use library functions
- Enhanced zoom behavior: minScale 0.5, maxScale 5, smooth 0.1 step increments

### Improved

- Significantly reduced component complexity in PhotoPreviewModal
- Better mobile performance with native gesture handling
- Easier maintenance with battle-tested library replacing custom code
- Industry-standard interaction patterns matching native photo viewers

### Removed

- Manual touch event handlers (getTouchDistance, getTouchCenter)
- Complex state management (zoomLevel, panPosition, isDragging, dragStart, pinchStart, lastZoomLevel)
- Refs for tracking stale closures (zoomLevelRef, panPositionRef)
- 8 custom event handler functions

## [2.3.0] - 2025-01-27

### Added

- Windows 7 Aero-style transparent search bar:
  - Enhanced transparency (35% opacity) with 40px blur for better map visibility
  - Improved backdrop-filter with 200% saturation for frosted glass effect
  - Translucent input fields and location chips
- Natural pan/drag functionality for full-screen photo preview:
  - Touch support for mobile devices (iOS and Android)
  - Click and drag support for desktop
  - Panning works at any zoom level (not just when zoomed in)
  - Smooth drag experience similar to viewing large photos

### Changed

- Comparison section styling:
  - More compact design with reduced vertical space
  - Frosted glass appearance with Apple Liquid Glass design tokens
  - Dynamic hint text that changes based on selection state
  - More prominent buttons with solid colors when active
- Full-screen preview panning:
  - Removed pan button controls in favor of natural drag behavior
  - Improved cursor feedback (grab/grabbing states)
  - Better touch handling on iOS to prevent text selection

### Fixed

- iOS text selection issue when trying to pan images:
  - Added user-select: none and WebkitUserSelect: none
  - Added WebkitTouchCallout: none to prevent iOS callout menu
  - Prevented native drag and context menu behaviors
  - Improved touch event handling with proper preventDefault

## [2.2.0] - 2024-11-24

### Added

- TIFF to WEBP/PNG conversion service integration:
  - Automatic background conversion when opening photo preview modals
  - Silent conversion service that converts TIFF images to WEBP format for better web performance
  - Conversion progress indicator at bottom of image preview
  - Automatic fallback to thumbnail if conversion fails
- Enhanced full-screen image viewing:
  - Fit-to-screen zoom functionality that automatically calculates optimal zoom level
  - Pan controls (up, down, left, right) for navigating zoomed images
  - Pan controls appear when zoomed in (zoom > 100%)
  - Improved zoom controls with separate fit-to-screen and reset buttons
  - Zoom level indicator in both top-left corner and pan control center

### Changed

- Conversion progress bar moved from top to bottom of image preview for better visibility
- Photo preview now automatically displays converted WEBP images instead of thumbnails when available
- Full-screen mode zoom controls reorganized with clearer button purposes

### Improved

- Better image loading experience with thumbnail shown while conversion happens in background
- Improved mobile image viewing with proper fallback handling
- Enhanced desktop image viewing with automatic high-quality image conversion
- Better error handling for conversion failures with graceful fallback to thumbnails

## [2.1.0] - 2024-11-19

### Added

- Advanced alignment controls for Then vs Now modal:
  - Interactive position adjustment (X/Y offset)
  - Scale control (0.5x to 2x zoom)
  - Rotation control (±45°)
  - Opacity control (0-100%)
  - Crop controls for removing film artifacts from all edges
  - Reset button for all adjustments
- Rotation controls for both images in side-by-side view
- Detailed loading progress messages for satellite imagery
- Mobile search drawer (similar to filters) - search bar hidden after search
- Unified 4-button view control on mobile (Grid, Map, Timeline, Gallery)
- Landscape orientation support for Then vs Now modal on mobile

### Changed

- Then vs Now modal now uses Esri World Imagery instead of LIST services for better reliability
- Mobile view toggles consolidated into single unified control (removed duplicate Grid button)
- Comparison tray buttons made more compact and reordered (Then vs Now first)
- Image manipulation controls moved above images in desktop Then vs Now modal

### Improved

- Better space efficiency on mobile with optimized toggle button layouts
- Improved Then vs Now modal layout for desktop (no scrolling needed)
- Fixed satellite imagery loading issues
- Enhanced mobile UX with drawer-based search interface
- Better alignment tooltip explaining why images may not align perfectly

## [2.0.0] - 2024-11-19

### Added

- Area selection feature - draw rectangles on map to search for photos covering that area
- PhotoViewer component - unified photo viewing experience across all views
- Mobile filter bottom sheet for better mobile UX
- Changelog modal accessible by clicking version number

### Changed

- Redesigned layout with collapsible sidebar (replaced resizable sidebar)
- Replaced ComparisonTray with floating action button (FAB) menu
- Redesigned FilterPanel with more compact design and better visual hierarchy
- Consolidated PhotoPreviewModal and PhotoGallery into single PhotoViewer component

### Improved

- Optimized PhotoMarkers - reduced max polygons from 200 to 100 with prioritization
- Enhanced theme with better contrast, spacing, and consistent styling
- Better mobile experience with improved touch targets and responsive design
- Performance optimizations throughout the application
- AppBar design with cleaner appearance

## [1.6.0] - Previous Version

### Added

- Project foundation setup

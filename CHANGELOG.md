# Changelog

All notable changes to this project will be documented in this file.

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

# Changelog

All notable changes to this project will be documented in this file.

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

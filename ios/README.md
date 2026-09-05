# Tasmania Aerial Explorer iOS

Native iOS companion app for the Tasmania Aerial Photo Explorer.

This folder is reserved for the iOS app and its supporting planning docs. The web app remains in the repository root `src/` Astro project.

## Initial Direction

- Swift + SwiftUI for the native app.
- Apple MapKit for the first map implementation.
- Cloudflare Workers API as the app backend boundary.
- Cloudflare R2/KV/D1/Cache for metadata, thumbnails, source TIFFs, generated tiles, favorites, and history.
- A dedicated native image viewer that consumes Cloudflare tile manifests and image tiles.
- Preserve HTTP Range-capable TIFF access for compatibility and future native TIFF experiments.

## Recommended Folder Shape

```text
ios/
|-- README.md
|-- AGENTS.md
|-- PROJECT_PLAN.md
|-- SCAFFOLDING.md
|-- API_CONTRACT.md
|-- UI_DESIGN.md
|-- TasmaniaAerialExplorer/          # Future Xcode project root
|   |-- TasmaniaAerialExplorer.xcodeproj
|   |-- TasmaniaAerialExplorer/
|   |   |-- App/
|   |   |-- Features/
|   |   |-- Domain/
|   |   |-- Infrastructure/
|   |   |-- DesignSystem/
|   |   |-- Resources/
|   |-- TasmaniaAerialExplorerTests/
|   |-- TasmaniaAerialExplorerUITests/
```

Do not place generated Xcode build products in this folder. Keep DerivedData outside the repo.

## UI Direction

The iOS app is a fresh native product. Use the existing Astro/React app only as reference for backend behavior, Cloudflare architecture, ArcGIS integration, TIFF handling, caching, and data model edge cases.

Do not port the web UI. Follow [UI_DESIGN.md](/Users/awhob/dev/tas-aerial-explorer/ios/UI_DESIGN.md), Apple Human Interface Guidelines, and the current Liquid Glass design language for native controls and navigation.

## Agent Instructions

Agents working on the native app must read and maintain [AGENTS.md](/Users/awhob/dev/tas-aerial-explorer/ios/AGENTS.md). That file tracks iOS-specific progress, decisions, blockers, and session notes.

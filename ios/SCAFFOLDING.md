# iOS Scaffolding Guide

## What You Can Do Before Paying Apple

You can do a lot before paying for the Apple Developer Program:

- Install Xcode from the Mac App Store.
- Create the SwiftUI project.
- Build and run in the iOS Simulator.
- Build and run on your own physical iPhone with a free Apple Account, with limitations.
- Use MapKit in development.
- Build the Cloudflare API.
- Implement search, map browsing, image preview, tile loading, local favorites, and tests.
- Use local `.xcconfig` files for API base URLs.

You generally need the paid Apple Developer Program when you want:

- TestFlight distribution.
- App Store distribution.
- Production signing/provisioning at scale.
- App Store Connect setup for real releases.
- Some advanced Apple capabilities and services.

Budget assumption: the paid program is not needed for early development. Plan to enroll before external beta testing.

## Manual Xcode Scaffold

1. Open Xcode.
2. Choose `File > New > Project`.
3. Select `iOS > App`.
4. Use these settings:

```text
Product Name: TasmaniaAerialExplorer
Interface: SwiftUI
Language: Swift
Testing System: XCTest
Storage: None for now
Bundle Identifier: uk.awhq.TasmaniaAerialExplorer or your preferred reverse-DNS id
Location: /Users/awhob/dev/tas-aerial-explorer/ios
```

5. Create the project in:

```text
/Users/awhob/dev/tas-aerial-explorer/ios/TasmaniaAerialExplorer
```

6. In Xcode project settings:

```text
Deployment Target: iOS 18.0 recommended
Supported Destinations: iPhone first, iPad later
Signing: automatic for local development
```

## Initial Swift Packages

Start with no third-party dependencies. Add packages only when the native implementation proves they are needed.

Likely later additions:

- A logging package if `OSLog` is insufficient.
- A SQLite wrapper if SwiftData is not a good fit.
- A custom image cache only if `URLCache` plus a small disk cache is insufficient.

Avoid adding Google Maps initially if MapKit is acceptable. It adds credentials, billing setup, and another SDK surface before the product loop is proven.

## Suggested Source Layout

```text
TasmaniaAerialExplorer/
|-- App/
|   |-- TasmaniaAerialExplorerApp.swift
|   |-- AppRootView.swift
|   |-- AppEnvironment.swift
|
|-- DesignSystem/
|   |-- AppColor.swift
|   |-- AppSpacing.swift
|   |-- AppTypography.swift
|
|-- Domain/
|   |-- Photo.swift
|   |-- Layer.swift
|   |-- SearchQuery.swift
|   |-- TileManifest.swift
|
|-- Infrastructure/
|   |-- API/
|   |   |-- APIClient.swift
|   |   |-- APIError.swift
|   |   |-- APIEndpoint.swift
|   |-- Cache/
|   |   |-- TileCache.swift
|   |-- Persistence/
|       |-- FavoritesStore.swift
|
|-- Features/
|   |-- Search/
|   |-- Map/
|   |-- Viewer/
|   |-- Timeline/
|   |-- Favorites/
|
|-- Resources/
|   |-- Assets.xcassets
|   |-- Dev.xcconfig
|   |-- Staging.xcconfig
|   |-- Production.xcconfig
```

## First Commit Checklist

- [ ] Xcode project opens from `ios/TasmaniaAerialExplorer`.
- [ ] App runs in iPhone simulator.
- [ ] Root tab shell exists.
- [ ] Map tab shows Tasmania in MapKit.
- [ ] API client can call `/api/v1/health`.
- [ ] No signing secrets or personal provisioning files committed.


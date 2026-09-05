# Native iOS UI Direction

## Hard Rule

The existing Astro/React web app is reference material for backend behavior, API shape, Cloudflare architecture, ArcGIS integration, TIFF handling, caching, data models, and edge cases only.

Do not port, copy, or visually translate the web UI.

Avoid using the web app as reference for:

- screen layouts;
- navigation structure;
- component hierarchy;
- colors;
- typography;
- glass panel styling;
- cards;
- desktop/sidebar patterns;
- Tailwind utility composition;
- browser-specific interactions.

The iOS app must be designed as a fresh native SwiftUI app.

## Apple Design Direction

Follow Apple Human Interface Guidelines and current iOS platform conventions.

Use the Liquid Glass design language where the system intends it:

- tab bars;
- navigation bars;
- toolbars;
- floating controls;
- transient controls;
- sheets and controls that sit above content.

Do not use Liquid Glass as a decorative content style. Liquid Glass should create hierarchy between interactive controls and underlying content, not become the general background treatment for every panel.

Use standard iOS materials and system backgrounds for content areas:

- map content;
- result lists;
- metadata panels;
- photo details;
- timeline rows;
- saved/favorites lists.

## Product Shape

The native app should feel like a modern iOS field-browsing tool:

- launch into useful app functionality, not a web-style landing page;
- prefer map-first browsing;
- use a native tab bar for primary navigation;
- use sheets with detents for search, filters, result previews, and metadata;
- use `NavigationStack` per tab;
- use native toolbars and SF Symbols;
- use Dynamic Type;
- support system dark mode;
- respect Reduce Motion, Increase Contrast, and transparency accessibility settings;
- use haptics sparingly for meaningful state changes.

## Initial IA

```text
Tab bar
  Map
  Search
  Timeline
  Saved

Map
  Full-screen MapKit canvas
  Liquid Glass tab/navigation/toolbar layer
  Bottom sheet for search/results/selection

Viewer
  Dedicated tile-based image viewer
  Minimal controls floating above imagery
  Metadata as a detented sheet

Saved
  Native list/grid of favorites and recent imagery
```

## Visual Rules

- Prefer native components before custom controls.
- Prefer SF Symbols before custom icons.
- Use semantic system colors unless a product-specific color is necessary.
- Keep imagery and map content visually dominant.
- Keep controls legible against satellite/aerial imagery.
- Avoid heavy custom blur stacks that fight Liquid Glass.
- Avoid web-like card grids as the primary interaction model on iPhone.
- Use rounded forms and spacing consistent with current iOS controls.
- Validate every screen in light mode, dark mode, increased contrast, reduced transparency, and Dynamic Type.

## References

- Apple Liquid Glass overview: https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- Apple Human Interface Guidelines, Materials: https://developer.apple.com/design/human-interface-guidelines/materials


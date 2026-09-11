# Globe geography

`globe-land.json` contains alternating longitude/latitude coordinates sampled from
Natural Earth's public-domain 1:50m country polygons, including islands such as
Tasmania. Country IDs are used during generation to leave subtle boundary gaps.
This is decorative geography, not a map for navigation or boundary disputes.

Source: https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_50m_admin_0_countries.geojson
License: https://www.naturalearthdata.com/about/terms-of-use/ (public domain)

Regenerate with `python scripts/generate-globe.py <source.geojson>` (requires Pillow).
The renderer uses the same deterministic coordinates for WebGL and Canvas 2D.

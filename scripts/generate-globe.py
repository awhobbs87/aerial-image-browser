"""Generate decorative globe dots from Natural Earth's public-domain 1:50m countries.

Usage: python scripts/generate-globe.py /path/to/ne_50m_admin_0_countries.geojson
Requires Pillow. Source: https://github.com/nvkelso/natural-earth-vector
"""
import json
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw

source = json.loads(Path(sys.argv[1]).read_text())
# Rasterize once at 0.05 degrees; keep country IDs to leave a narrow border gap.
width, height = 7200, 3600
mask = Image.new('I', (width, height))
draw = ImageDraw.Draw(mask)
for country_id, feature in enumerate(source['features'], 1):
    geometry = feature['geometry']
    polygons = geometry['coordinates'] if geometry['type'] == 'MultiPolygon' else [geometry['coordinates']]
    for polygon in polygons:
        for index, ring in enumerate(polygon):
            points = [((lon + 180) * 20, (90 - lat) * 20) for lon, lat in ring]
            draw.polygon(points, fill=country_id if index == 0 else 0)

pixels = mask.load()
points = []
step = 0.7
for row in range(int(180 / step)):
    lat = -90 + (row + 0.5) * step
    count = max(1, round(360 * math.cos(math.radians(lat)) / step))
    for column in range(count):
        lon = -180 + (column + 0.5 * (row % 2)) * 360 / count
        x, y = int((lon + 180) * 20) % width, min(height - 1, int((90 - lat) * 20))
        country = pixels[x, y]
        if not country:
            continue
        # Separate neighboring countries without eroding island/coastline detail.
        neighbors = [pixels[(x + dx) % width, max(0, min(height - 1, y + dy))]
                     for dx, dy in [(-3, 0), (3, 0), (0, -3), (0, 3)]]
        if any(value not in (0, country) for value in neighbors):
            continue
        points.extend([round(lon, 3), round(lat, 3)])

output = Path(__file__).resolve().parents[1] / 'src/data/globe-land.json'
output.write_text(json.dumps(points, separators=(',', ':')) + '\n')
print(f'{len(points) // 2:,} land dots, {output.stat().st_size:,} bytes')

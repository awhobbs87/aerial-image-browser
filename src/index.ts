import { Hono } from "hono";
import { cors } from "hono/cors";
import { api } from "./routes/api";
import type { Bindings } from "./types";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin) => {
      const allowed = [
        "http://localhost:5173",
        "https://tas-aerial-browser.awhobbs.workers.dev",
      ];
      // Allow all Cloudflare Pages deployments (production and previews)
      if (origin?.endsWith(".tas-aerial-explorer.pages.dev")) {
        return origin;
      }
      // Allow specific origins
      if (allowed.includes(origin)) {
        return origin;
      }
      // Default: allow the request origin (permissive for public API)
      return origin;
    },
    credentials: true,
  })
);

app.route("/api", api);

app.get("/", (c) =>
  c.json({
    name: "Tasmania Aerial Photos API",
    version: "1.0.0",
    endpoints: {
      layers: "/api/layers",
      searchLocation: "/api/search/location?lat=X&lon=Y&layers=0,1,2",
      searchBounds: "/api/search/bounds?west=X&south=Y&east=Z&north=W&layers=0,1,2",
      health: "/health",
      test: "/test",
    },
  })
);

// Test page endpoint
app.get("/test", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tasmania Aerial Photos - API Test</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
        }

        .header {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        h1 {
            color: #2d3748;
            margin-bottom: 10px;
            font-size: 2em;
        }

        .subtitle {
            color: #718096;
            margin-bottom: 20px;
        }

        .controls {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 20px;
        }

        button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
        }

        button:hover {
            background: #5568d3;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        button:disabled {
            background: #cbd5e0;
            cursor: not-allowed;
            transform: none;
        }

        .status {
            background: white;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .status-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid #e2e8f0;
        }

        .status-item:last-child {
            border-bottom: none;
        }

        .status-label {
            font-weight: 600;
            color: #4a5568;
        }

        .status-value {
            color: #2d3748;
        }

        .results {
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .results h2 {
            color: #2d3748;
            margin-bottom: 20px;
            font-size: 1.5em;
        }

        .photo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }

        .photo-card {
            background: #f7fafc;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            transition: transform 0.3s, box-shadow 0.3s;
        }

        .photo-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }

        .photo-thumbnail {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: #edf2f7;
        }

        .photo-info {
            padding: 15px;
        }

        .photo-title {
            font-weight: 600;
            color: #2d3748;
            margin-bottom: 8px;
            font-size: 14px;
        }

        .photo-meta {
            font-size: 13px;
            color: #718096;
            margin-bottom: 4px;
        }

        .photo-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }

        .photo-actions a {
            flex: 1;
            text-align: center;
            padding: 8px 12px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            transition: background 0.3s;
        }

        .photo-actions a:hover {
            background: #5568d3;
        }

        .photo-actions a.disabled {
            background: #cbd5e0;
            pointer-events: none;
        }

        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            margin-right: 6px;
        }

        .badge-aerial {
            background: #bee3f8;
            color: #2c5282;
        }

        .badge-ortho {
            background: #c6f6d5;
            color: #22543d;
        }

        .badge-digital {
            background: #fed7d7;
            color: #742a2a;
        }

        .badge-cached {
            background: #9ae6b4;
            color: #22543d;
        }

        .loading {
            text-align: center;
            padding: 40px;
            color: #718096;
        }

        .error {
            background: #fed7d7;
            color: #742a2a;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
        }

        .input-group {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }

        .input-group input {
            flex: 1;
            padding: 10px;
            border: 2px solid #e2e8f0;
            border-radius: 6px;
            font-size: 14px;
        }

        .input-group input:focus {
            outline: none;
            border-color: #667eea;
        }

        pre {
            background: #1a202c;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 8px;
            overflow-x: auto;
            font-size: 12px;
            margin-top: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🗺️ Tasmania Aerial Photos - API Test</h1>
            <p class="subtitle">Testing connection to worker API and ArcGIS data</p>

            <div class="controls">
                <button onclick="testHealth()">Test Health</button>
                <button onclick="testLayers()">Get Layers</button>
                <button onclick="testHobart()">Search Hobart</button>
                <button onclick="testLaunceston()">Search Launceston</button>
                <button onclick="testBounds()">Search Bounds</button>
            </div>

            <div class="input-group">
                <input type="number" id="lat" placeholder="Latitude (e.g., -42.8821)" step="0.0001" value="-42.8821">
                <input type="number" id="lon" placeholder="Longitude (e.g., 147.3272)" step="0.0001" value="147.3272">
                <button onclick="searchCustomLocation()">Search Custom Location</button>
            </div>
        </div>

        <div id="status" class="status" style="display: none;">
            <h2>Status</h2>
            <div id="statusContent"></div>
        </div>

        <div id="results" class="results" style="display: none;">
            <h2 id="resultsTitle">Results</h2>
            <div id="resultsContent"></div>
        </div>
    </div>

    <script>
        // Configuration - use relative path since served from same origin
        const API_BASE = window.location.origin;

        // Test coordinates
        const HOBART = { lat: -42.8821, lon: 147.3272 };
        const LAUNCESTON = { lat: -41.4332, lon: 147.1441 };

        // Helper functions
        function showLoading() {
            const results = document.getElementById('results');
            results.style.display = 'block';
            document.getElementById('resultsTitle').textContent = 'Loading...';
            document.getElementById('resultsContent').innerHTML = '<div class="loading">Fetching data from API...</div>';
        }

        function showError(error) {
            const results = document.getElementById('results');
            results.style.display = 'block';
            document.getElementById('resultsTitle').textContent = 'Error';
            document.getElementById('resultsContent').innerHTML = \`
                <div class="error">
                    <strong>Error:</strong> \${error.message || error}
                </div>
                <pre>\${JSON.stringify(error, null, 2)}</pre>
            \`;
        }

        function showStatus(data) {
            const status = document.getElementById('status');
            const content = document.getElementById('statusContent');
            status.style.display = 'block';

            let html = '';
            if (data.connections) {
                Object.entries(data.connections).forEach(([key, value]) => {
                    html += \`
                        <div class="status-item">
                            <span class="status-label">\${key.toUpperCase()}</span>
                            <span class="status-value">\${value.status || value}</span>
                        </div>
                    \`;
                });
            }

            content.innerHTML = html;
        }

        // API Test Functions
        async function testHealth() {
            showLoading();
            try {
                const response = await fetch(\`\${API_BASE}/health\`);
                const data = await response.json();

                showStatus(data);

                document.getElementById('results').style.display = 'block';
                document.getElementById('resultsTitle').textContent = 'Health Check Results';
                document.getElementById('resultsContent').innerHTML = \`
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                \`;
            } catch (error) {
                showError(error);
            }
        }

        async function testLayers() {
            showLoading();
            try {
                const response = await fetch(\`\${API_BASE}/api/layers\`);
                const data = await response.json();

                document.getElementById('results').style.display = 'block';
                document.getElementById('resultsTitle').textContent = 'Available Layers';
                document.getElementById('resultsContent').innerHTML = \`
                    <pre>\${JSON.stringify(data, null, 2)}</pre>
                \`;
            } catch (error) {
                showError(error);
            }
        }

        async function testHobart() {
            await searchLocation(HOBART.lat, HOBART.lon, 'Hobart');
        }

        async function testLaunceston() {
            await searchLocation(LAUNCESTON.lat, LAUNCESTON.lon, 'Launceston');
        }

        async function searchCustomLocation() {
            const lat = parseFloat(document.getElementById('lat').value);
            const lon = parseFloat(document.getElementById('lon').value);

            if (isNaN(lat) || isNaN(lon)) {
                alert('Please enter valid latitude and longitude');
                return;
            }

            await searchLocation(lat, lon, 'Custom Location');
        }

        async function searchLocation(lat, lon, locationName) {
            showLoading();
            try {
                const response = await fetch(\`\${API_BASE}/api/search/location?lat=\${lat}&lon=\${lon}&layers=0,1,2\`);
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Search failed');
                }

                displayPhotos(data.data.photos, \`\${locationName} (\${lat}, \${lon})\`);
            } catch (error) {
                showError(error);
            }
        }

        async function testBounds() {
            showLoading();
            try {
                // Small area around Hobart
                const bounds = {
                    west: 147.2,
                    south: -42.95,
                    east: 147.4,
                    north: -42.80
                };

                const response = await fetch(
                    \`\${API_BASE}/api/search/bounds?west=\${bounds.west}&south=\${bounds.south}&east=\${bounds.east}&north=\${bounds.north}&layers=0,1,2\`
                );
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || 'Search failed');
                }

                displayPhotos(data.data.photos, 'Hobart Area (Bounds Search)');
            } catch (error) {
                showError(error);
            }
        }

        function displayPhotos(photos, title) {
            const results = document.getElementById('results');
            const content = document.getElementById('resultsContent');

            results.style.display = 'block';
            document.getElementById('resultsTitle').textContent = \`\${title} - \${photos.length} photos found\`;

            if (photos.length === 0) {
                content.innerHTML = '<div class="loading">No photos found for this location</div>';
                return;
            }

            let html = '<div class="photo-grid">';

            photos.forEach(photo => {
                const layerBadge = \`badge-\${photo.layerType}\`;
                const cachedBadge = photo.cached ? '<span class="badge badge-cached">TIFF Cached</span>' : '';
                const thumbnailCachedBadge = photo.thumbnailCached ? '<span class="badge badge-cached">Thumb Cached</span>' : '';

                // Use the thumbnail link if available
                const thumbnailUrl = photo.THUMBNAIL_LINK || '';
                const downloadUrl = photo.DOWNLOAD_LINK || '';

                html += \`
                    <div class="photo-card">
                        \${thumbnailUrl ? \`
                            <img src="\${thumbnailUrl}"
                                 alt="\${photo.IMAGE_NAME}"
                                 class="photo-thumbnail"
                                 onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'200\\'%3E%3Crect width=\\'300\\' height=\\'200\\' fill=\\'%23edf2f7\\'/%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-family=\\'sans-serif\\' font-size=\\'14\\' fill=\\'%23718096\\'%3ENo Thumbnail%3C/text%3E%3C/svg%3E'">
                        \` : \`
                            <div class="photo-thumbnail" style="display: flex; align-items: center; justify-content: center; color: #718096;">
                                No Thumbnail Available
                            </div>
                        \`}
                        <div class="photo-info">
                            <div style="margin-bottom: 8px;">
                                <span class="badge \${layerBadge}">\${photo.layerType.toUpperCase()}</span>
                                \${cachedBadge}
                                \${thumbnailCachedBadge}
                            </div>
                            <div class="photo-title">\${photo.IMAGE_NAME || 'Unknown'}</div>
                            <div class="photo-meta">
                                <strong>Date:</strong> \${photo.dateFormatted || 'Unknown'}
                            </div>
                            <div class="photo-meta">
                                <strong>Scale:</strong> \${photo.scaleFormatted || 'N/A'}
                            </div>
                            <div class="photo-meta">
                                <strong>Type:</strong> \${photo.IMAGE_TYPE || 'N/A'}
                            </div>
                            <div class="photo-meta">
                                <strong>Project:</strong> \${photo.PROJ_NAME || 'N/A'}
                            </div>
                            <div class="photo-actions">
                                \${downloadUrl ? \`
                                    <a href="\${downloadUrl}" target="_blank">View TIFF</a>
                                \` : \`
                                    <a class="disabled">No TIFF Link</a>
                                \`}
                                \${thumbnailUrl ? \`
                                    <a href="\${thumbnailUrl}" target="_blank">View Full Thumb</a>
                                \` : \`
                                    <a class="disabled">No Thumbnail</a>
                                \`}
                            </div>
                        </div>
                    </div>
                \`;
            });

            html += '</div>';
            content.innerHTML = html;
        }

        // Auto-run health check on load
        window.addEventListener('load', () => {
            testHealth();
        });
    </script>
</body>
</html>`;

  return c.html(html);
});

// Health check endpoint
app.get("/health", async (c) => {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    environment: "production",
    connections: {},
  };

  // Test D1 Database
  try {
    const tablesResult = await c.env.PHOTOS_DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all();

    results.connections.d1 = {
      status: "✅ Connected",
      database: "tas-browser",
      tables: tablesResult.results?.map((r: any) => r.name) || [],
      tableCount: tablesResult.results?.length || 0,
    };
  } catch (error) {
    results.connections.d1 = {
      status: "❌ Error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Test KV Namespace
  try {
    const testKey = "connection-test";
    const testValue = `Test at ${Date.now()}`;

    await c.env.PHOTO_CACHE.put(testKey, testValue, { expirationTtl: 60 });
    const retrievedValue = await c.env.PHOTO_CACHE.get(testKey);

    results.connections.kv = {
      status: retrievedValue === testValue ? "✅ Connected" : "⚠️ Mismatch",
      namespace: "PHOTO_CACHE",
      writeTest: "success",
      readTest: "success",
      id: "6b0c54bb697d44c5b8dd97f02141bfdf",
    };
  } catch (error) {
    results.connections.kv = {
      status: "❌ Error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Test R2 TIFF Storage
  try {
    const testKey = "connection-test.txt";
    const testContent = `Connection test at ${new Date().toISOString()}`;

    await c.env.TIFF_STORAGE.put(testKey, testContent);
    const retrieved = await c.env.TIFF_STORAGE.get(testKey);

    results.connections.r2_tiff = {
      status: retrieved ? "✅ Connected" : "⚠️ Get failed",
      bucket: "tas-aerial-browser-tiffs",
      writeTest: "success",
      readTest: retrieved ? "success" : "failed",
    };

    // Clean up test file
    await c.env.TIFF_STORAGE.delete(testKey);
  } catch (error) {
    results.connections.r2_tiff = {
      status: "❌ Error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Test R2 Thumbnail Storage
  try {
    const testKey = "connection-test.txt";
    const testContent = `Connection test at ${new Date().toISOString()}`;

    await c.env.THUMBNAIL_STORAGE.put(testKey, testContent);
    const retrieved = await c.env.THUMBNAIL_STORAGE.get(testKey);

    results.connections.r2_thumbnail = {
      status: retrieved ? "✅ Connected" : "⚠️ Get failed",
      bucket: "tas-aerial-browser-thumbnails",
      writeTest: "success",
      readTest: retrieved ? "success" : "failed",
    };

    // Clean up test file
    await c.env.THUMBNAIL_STORAGE.delete(testKey);
  } catch (error) {
    results.connections.r2_thumbnail = {
      status: "❌ Error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // Test API Base URL
  results.connections.api_base_url = {
    status: c.env.API_BASE_URL ? "✅ Configured" : "❌ Missing",
    url: c.env.API_BASE_URL,
  };

  // Overall status
  const allConnected = Object.values(results.connections).every(
    (conn: any) => conn.status.startsWith("✅")
  );

  results.overall = allConnected
    ? "✅ All connections successful"
    : "⚠️ Some connections failed";

  return c.json(results);
});

app.notFound((c) => c.json({ success: false, error: "Not found" }, 404));
app.onError((err, c) => {
  console.error(err);
  return c.json({ success: false, error: "Internal error" }, 500);
});

export default app;

import { Hono } from "hono";
import { cors } from "hono/cors";
import { api } from "./routes/api";
import type { Bindings } from "./types";

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: ["http://localhost:5173", "https://tas-aerial-browser.awhobbs.workers.dev"],
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
    },
  })
);

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

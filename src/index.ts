// Connection test endpoint - will be replaced in Stage 2
interface Env {
  PHOTO_CACHE: KVNamespace;
  PHOTOS_DB: D1Database;
  TIFF_STORAGE: R2Bucket;
  THUMBNAIL_STORAGE: R2Bucket;
  API_BASE_URL: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === "/health") {
      const results: Record<string, any> = {
        timestamp: new Date().toISOString(),
        environment: "production",
        connections: {},
      };

      // Test D1 Database
      try {
        const tablesResult = await env.PHOTOS_DB.prepare(
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

        await env.PHOTO_CACHE.put(testKey, testValue, { expirationTtl: 60 });
        const retrievedValue = await env.PHOTO_CACHE.get(testKey);

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

        await env.TIFF_STORAGE.put(testKey, testContent);
        const retrieved = await env.TIFF_STORAGE.get(testKey);

        results.connections.r2_tiff = {
          status: retrieved ? "✅ Connected" : "⚠️ Get failed",
          bucket: "tas-aerial-browser-tiffs",
          writeTest: "success",
          readTest: retrieved ? "success" : "failed",
        };

        // Clean up test file
        await env.TIFF_STORAGE.delete(testKey);
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

        await env.THUMBNAIL_STORAGE.put(testKey, testContent);
        const retrieved = await env.THUMBNAIL_STORAGE.get(testKey);

        results.connections.r2_thumbnail = {
          status: retrieved ? "✅ Connected" : "⚠️ Get failed",
          bucket: "tas-aerial-browser-thumbnails",
          writeTest: "success",
          readTest: retrieved ? "success" : "failed",
        };

        // Clean up test file
        await env.THUMBNAIL_STORAGE.delete(testKey);
      } catch (error) {
        results.connections.r2_thumbnail = {
          status: "❌ Error",
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }

      // Test API Base URL
      results.connections.api_base_url = {
        status: env.API_BASE_URL ? "✅ Configured" : "❌ Missing",
        url: env.API_BASE_URL,
      };

      // Overall status
      const allConnected = Object.values(results.connections).every(
        (conn: any) => conn.status.startsWith("✅")
      );

      results.overall = allConnected
        ? "✅ All connections successful"
        : "⚠️ Some connections failed";

      return new Response(JSON.stringify(results, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Default response
    return new Response(
      JSON.stringify({
        name: "Tasmania Aerial Photos API",
        version: "1.0.0-dev",
        status: "Connection test mode",
        endpoints: {
          health: "/health - Test all Cloudflare bindings (D1, KV, R2)",
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  },
};

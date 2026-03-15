import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import type { HealthResponse } from "../../types/api";

export const GET: APIRoute = async () => {
  const bindings = {
    kv: false,
    d1: false,
    r2: false,
    ai: false,
  };

  // Test KV
  try {
    await env.PHOTO_CACHE.get("__health_check__");
    bindings.kv = true;
  } catch {
    // KV unavailable
  }

  // Test D1
  try {
    await env.PHOTOS_DB.prepare("SELECT 1").first();
    bindings.d1 = true;
  } catch {
    // D1 unavailable
  }

  // Test R2
  try {
    await env.TIFF_STORAGE.head("__health_check__");
    bindings.r2 = true;
  } catch {
    // R2 unavailable
  }

  // Test AI
  try {
    if (env.AI) {
      bindings.ai = true;
    }
  } catch {
    // AI unavailable
  }

  const allHealthy = Object.values(bindings).every(Boolean);

  const response: HealthResponse = {
    status: allHealthy ? "ok" : "degraded",
    timestamp: Date.now(),
    bindings,
  };

  return new Response(JSON.stringify(response), {
    status: allHealthy ? 200 : 503,
    headers: { "Content-Type": "application/json" },
  });
};

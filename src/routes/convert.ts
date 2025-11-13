import { Hono } from "hono";
import Vips from "wasm-vips";
import type { Bindings } from "../types";

export const convert = new Hono<{ Bindings: Bindings }>();

// Initialize vips (lazy load to reduce cold start impact)
let vips: any = null;

async function getVips() {
  if (!vips) {
    vips = await Vips();
  }
  return vips;
}

/**
 * Image conversion endpoint
 * GET /api/image/:layerId/:imageName
 *
 * Query params:
 * - format: 'png' | 'webp' (default: 'webp')
 * - quality: 1-100 (default: 95)
 * - size: 'thumbnail' | 'full' (default: 'full')
 */
convert.get("/image/:layerId/:imageName", async (c) => {
  try {
    const { layerId, imageName } = c.req.param();
    const format = c.req.query("format") || "webp";
    const quality = parseInt(c.req.query("quality") || "95", 10);
    const size = c.req.query("size") || "full";

    // Validate format
    if (format !== "webp" && format !== "png") {
      return c.json({ error: "Invalid format. Use 'webp' or 'png'" }, 400);
    }

    // Validate quality
    if (quality < 1 || quality > 100) {
      return c.json({ error: "Quality must be between 1 and 100" }, 400);
    }

    // Generate R2 key for converted image
    const r2Key = `converted/${layerId}/${imageName}-${size}.${format}`;

    // Check R2 cache first
    const cached = await c.env.CONVERTED_IMAGES.get(r2Key);
    if (cached) {
      return new Response(cached.body, {
        headers: {
          "Content-Type": format === "webp" ? "image/webp" : "image/png",
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Cache": "HIT",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Check if TIFF exists in R2 first
    const tiffKey = `layer${layerId}/${imageName}`;
    const tiffFromR2 = await c.env.TIFF_STORAGE.get(tiffKey);

    let tiffBuffer: ArrayBuffer;

    if (tiffFromR2) {
      // TIFF already cached in R2
      tiffBuffer = await tiffFromR2.arrayBuffer();
    } else {
      // Fetch original TIFF from external source
      // First, we need to get the download URL from the photo metadata
      // For now, return error - in production, you'd fetch from the original source
      return c.json({
        error: "TIFF not cached. Please trigger TIFF caching first via /api/tiff endpoint",
        hint: "Call /api/tiff/:layerId/:imageName first to cache the TIFF"
      }, 404);
    }

    // Convert using wasm-vips
    const vipsInstance = await getVips();

    // Load image from buffer
    const image = vipsInstance.Image.newFromBuffer(new Uint8Array(tiffBuffer));

    let processedImage = image;

    // Resize if thumbnail requested
    if (size === "thumbnail") {
      // Resize to 400px width, maintain aspect ratio
      const scale = 400 / image.width;
      processedImage = image.resize(scale);
    }

    // Convert to target format
    let outputBuffer: Uint8Array;
    if (format === "webp") {
      outputBuffer = processedImage.webpsaveBuffer({
        Q: quality,
        effort: 6  // Balance between quality and speed
      });
    } else {
      outputBuffer = processedImage.pngsaveBuffer({
        compression: 6  // Balance between size and speed
      });
    }

    // Store in R2
    await c.env.CONVERTED_IMAGES.put(r2Key, outputBuffer, {
      httpMetadata: {
        contentType: format === "webp" ? "image/webp" : "image/png",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    // Return converted image
    return new Response(outputBuffer, {
      headers: {
        "Content-Type": format === "webp" ? "image/webp" : "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache": "MISS",
        "X-Conversion-Time": `${Date.now()}ms`,
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Image conversion error:", error);
    return c.json({
      error: "Failed to convert image",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

import { Hono } from "hono";
import { PhotonImage, SamplingFilter, resize } from "@cf-wasm/photon/workerd";
import type { Bindings } from "../types";

export const convert = new Hono<{ Bindings: Bindings }>();

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
      const contentType =
        format === "webp" ? "image/webp" :
        format === "png" ? "image/png" :
        "image/jpeg";

      return new Response(cached.body, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Cache": "HIT",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Check if TIFF exists in R2 first
    // R2Manager uses format: tiff/{layerId}/{imageName}.tif
    const cleanImageName = imageName.replace(/\.tif$/i, "");
    const tiffKey = `tiff/${layerId}/${cleanImageName}.tif`;
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

    // Convert using Photon
    console.log(`Converting TIFF: ${imageName}, size: ${tiffBuffer.byteLength} bytes`);

    let inputImage: typeof PhotonImage.prototype;
    try {
      inputImage = PhotonImage.new_from_byteslice(new Uint8Array(tiffBuffer));
      console.log(`Image loaded: ${inputImage.get_width()}x${inputImage.get_height()}`);
    } catch (error) {
      console.error("Failed to load TIFF with Photon:", error);
      return c.json({
        error: "Photon cannot decode this TIFF format",
        details: error instanceof Error ? error.message : "Unknown error",
        hint: "This TIFF may use an unsupported compression or color space"
      }, 500);
    }

    let outputImage: typeof PhotonImage.prototype;

    // Resize if thumbnail requested
    if (size === "thumbnail") {
      try {
        // Resize to 400px width, maintain aspect ratio
        const originalWidth = inputImage.get_width();
        const originalHeight = inputImage.get_height();
        const targetWidth = 400;
        const targetHeight = Math.round((targetWidth / originalWidth) * originalHeight);

        console.log(`Resizing from ${originalWidth}x${originalHeight} to ${targetWidth}x${targetHeight}`);

        outputImage = resize(
          inputImage,
          targetWidth,
          targetHeight,
          SamplingFilter.Lanczos3  // High quality resizing
        );

        inputImage.free(); // Free original image memory
      } catch (error) {
        inputImage.free();
        console.error("Failed to resize image:", error);
        return c.json({
          error: "Failed to resize image",
          details: error instanceof Error ? error.message : "Unknown error"
        }, 500);
      }
    } else {
      outputImage = inputImage;
    }

    // Convert to target format
    let outputBuffer: Uint8Array;
    let contentType: string;

    try {
      if (format === "webp") {
        outputBuffer = outputImage.get_bytes_webp();
        contentType = "image/webp";
      } else if (format === "png") {
        outputBuffer = outputImage.get_bytes();
        contentType = "image/png";
      } else {
        // JPEG fallback
        outputBuffer = outputImage.get_bytes_jpeg(quality);
        contentType = "image/jpeg";
      }

      console.log(`Converted to ${format}: ${outputBuffer.byteLength} bytes`);
    } catch (error) {
      outputImage.free();
      console.error("Failed to encode output:", error);
      return c.json({
        error: "Failed to encode output image",
        details: error instanceof Error ? error.message : "Unknown error"
      }, 500);
    }

    outputImage.free(); // Free processed image memory

    // Store in R2
    await c.env.CONVERTED_IMAGES.put(r2Key, outputBuffer, {
      httpMetadata: {
        contentType,
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    // Return converted image
    return new Response(outputBuffer, {
      headers: {
        "Content-Type": contentType,
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

import { Hono } from "hono";
import { ArcGISClient } from "../lib/arcgis";
import { CacheManager } from "../lib/cache";
import { R2Manager } from "../lib/r2";
import {
  convertTiffToWebP,
  estimateSizeReduction,
} from "../lib/imageConversion";
import {
  AIService,
  type GeocodingResult,
  type ParsedSearchQuery,
} from "../lib/ai";
import type { Bindings, EnhancedPhoto } from "../types";

export const api = new Hono<{ Bindings: Bindings }>();

function formatDate(timestamp?: number): string | null {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleDateString("en-AU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function enhancePhoto(
  feature: any,
  layerId: number,
): Omit<EnhancedPhoto, "cached" | "thumbnailCached"> {
  const attrs = feature.attributes;
  const layerType =
    layerId === 0 ? "aerial" : layerId === 1 ? "ortho" : "digital";

  return {
    ...attrs,
    geometry: feature.geometry, // Include geometry for map polygons
    layerId,
    layerType,
    dateFormatted: formatDate(attrs.FLY_DATE || attrs.CAPTURE_START_DATE),
    scaleFormatted: attrs.SCALE ? `1:${attrs.SCALE.toLocaleString()}` : null,
  };
}

function applyFilters(
  photos: EnhancedPhoto[],
  filters: {
    startDate?: string;
    endDate?: string;
    minScale?: number;
    maxScale?: number;
    imageTypes?: string[];
  },
): EnhancedPhoto[] {
  return photos.filter((photo) => {
    // Date filtering
    if (filters.startDate && photo.FLY_DATE) {
      const startDate = new Date(filters.startDate).getTime();
      if (photo.FLY_DATE < startDate) return false;
    }
    if (filters.endDate && photo.FLY_DATE) {
      const endDate = new Date(filters.endDate).getTime();
      if (photo.FLY_DATE > endDate) return false;
    }

    // Scale filtering
    if (filters.minScale && photo.SCALE && photo.SCALE < filters.minScale) {
      return false;
    }
    if (filters.maxScale && photo.SCALE && photo.SCALE > filters.maxScale) {
      return false;
    }

    // Image type filtering
    if (filters.imageTypes && filters.imageTypes.length > 0) {
      if (!filters.imageTypes.includes(photo.layerType)) {
        return false;
      }
    }

    return true;
  });
}

api.get("/layers", async (c) => {
  const cache = new CacheManager(c.env.PHOTO_CACHE);
  const cached = await cache.get("layers:all");
  if (cached) return c.json({ success: true, data: cached, cached: true });

  const client = new ArcGISClient(c.env.API_BASE_URL);
  const layers = await client.getLayers();
  await cache.set("layers:all", layers);

  return c.json({ success: true, data: layers, cached: false });
});

api.get("/search/location", async (c) => {
  const lat = parseFloat(c.req.query("lat") || "");
  const lon = parseFloat(c.req.query("lon") || "");
  const layers = (c.req.query("layers") || "0,1,2").split(",").map(Number);

  if (isNaN(lat) || isNaN(lon)) {
    return c.json({ success: false, error: "Invalid coordinates" }, 400);
  }

  // Parse filter parameters
  const filters = {
    startDate: c.req.query("startDate"),
    endDate: c.req.query("endDate"),
    minScale: c.req.query("minScale")
      ? parseFloat(c.req.query("minScale")!)
      : undefined,
    maxScale: c.req.query("maxScale")
      ? parseFloat(c.req.query("maxScale")!)
      : undefined,
    imageTypes: c.req.query("imageTypes")?.split(","),
  };

  const client = new ArcGISClient(c.env.API_BASE_URL);
  const r2 = new R2Manager(c.env.TIFF_STORAGE, c.env.THUMBNAIL_STORAGE);

  const results = await Promise.all(
    layers.map(async (layerId) => {
      const features = await client.queryByPoint(layerId, lon, lat);
      return features.map((f: any) => enhancePhoto(f, layerId));
    }),
  );

  let photos = results.flat() as EnhancedPhoto[];

  // Apply filters
  photos = applyFilters(photos, filters);

  // Set default cache status (checking R2 for hundreds of photos exceeds subrequest limit)
  // Cache status can be checked individually when needed
  photos.forEach((photo) => {
    photo.cached = false;
    photo.thumbnailCached = false;
  });

  photos.sort((a, b) => (b.FLY_DATE || 0) - (a.FLY_DATE || 0));

  return c.json({ success: true, data: { count: photos.length, photos } });
});

api.get("/search/bounds", async (c) => {
  const west = parseFloat(c.req.query("west") || "");
  const south = parseFloat(c.req.query("south") || "");
  const east = parseFloat(c.req.query("east") || "");
  const north = parseFloat(c.req.query("north") || "");

  if (isNaN(west) || isNaN(south) || isNaN(east) || isNaN(north)) {
    return c.json({ success: false, error: "Invalid bounds" }, 400);
  }

  const layers = (c.req.query("layers") || "0,1,2").split(",").map(Number);

  // Parse filter parameters
  const filters = {
    startDate: c.req.query("startDate"),
    endDate: c.req.query("endDate"),
    minScale: c.req.query("minScale")
      ? parseFloat(c.req.query("minScale")!)
      : undefined,
    maxScale: c.req.query("maxScale")
      ? parseFloat(c.req.query("maxScale")!)
      : undefined,
    imageTypes: c.req.query("imageTypes")?.split(","),
  };

  const client = new ArcGISClient(c.env.API_BASE_URL);
  const r2 = new R2Manager(c.env.TIFF_STORAGE, c.env.THUMBNAIL_STORAGE);

  const results = await Promise.all(
    layers.map(async (layerId) => {
      const features = await client.queryByBounds(
        layerId,
        west,
        south,
        east,
        north,
      );
      return features.map((f: any) => enhancePhoto(f, layerId));
    }),
  );

  let photos = results.flat() as EnhancedPhoto[];

  // Apply filters
  photos = applyFilters(photos, filters);

  // Set default cache status (checking R2 for hundreds of photos exceeds subrequest limit)
  // Cache status can be checked individually when needed
  photos.forEach((photo) => {
    photo.cached = false;
    photo.thumbnailCached = false;
  });

  photos.sort((a, b) => (b.FLY_DATE || 0) - (a.FLY_DATE || 0));

  return c.json({ success: true, data: { count: photos.length, photos } });
});

// TIFF proxy endpoint - downloads and caches TIFFs from ArcGIS
api.get("/tiff/:layerId/:imageName", async (c) => {
  const layerId = parseInt(c.req.param("layerId"));
  const imageName = c.req.param("imageName");

  if (isNaN(layerId) || !imageName) {
    return c.json({ success: false, error: "Invalid parameters" }, 400);
  }

  // Remove .tif extension if provided
  const cleanImageName = imageName.replace(/\.tif$/i, "");

  const r2 = new R2Manager(c.env.TIFF_STORAGE, c.env.THUMBNAIL_STORAGE);

  // Check if already cached
  const cached = await r2.getTiff(cleanImageName, layerId);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        "Content-Type": "image/tiff",
        "Cache-Control": "public, max-age=31536000",
        "X-Cache": "HIT",
      },
    });
  }

  // Search for the specific image by name to get download link
  const params = new URLSearchParams({
    f: "json",
    where: `IMAGE_NAME='${cleanImageName}.tif'`,
    outFields: "DOWNLOAD_LINK",
    returnGeometry: "false",
  });

  const searchResponse = await fetch(
    `${c.env.API_BASE_URL}/${layerId}/query?${params}`,
  );
  const searchData = (await searchResponse.json()) as {
    features?: Array<{ attributes: { DOWNLOAD_LINK?: string } }>;
  };

  if (!searchData.features || searchData.features.length === 0) {
    return c.json({ success: false, error: "Image not found in ArcGIS" }, 404);
  }

  const downloadLink = searchData.features[0].attributes.DOWNLOAD_LINK;
  if (!downloadLink) {
    return c.json({ success: false, error: "No download link available" }, 404);
  }

  // Download from ArcGIS
  const tiffResponse = await fetch(downloadLink);
  if (!tiffResponse.ok) {
    return c.json(
      { success: false, error: "Failed to download from ArcGIS" },
      502,
    );
  }

  // Read the response as ArrayBuffer for caching
  const tiffBuffer = await tiffResponse.arrayBuffer();

  // Store in R2
  await r2.putTiff(cleanImageName, layerId, tiffBuffer);

  // Return to user
  return new Response(tiffBuffer, {
    headers: {
      "Content-Type": "image/tiff",
      "Cache-Control": "public, max-age=31536000",
      "X-Cache": "MISS",
    },
  });
});

// Upload client-converted WebP to R2 cache
api.put("/webp/:layerId/:imageName", async (c) => {
  const layerId = parseInt(c.req.param("layerId"));
  const imageName = c.req.param("imageName");

  if (isNaN(layerId) || !imageName) {
    return c.json({ success: false, error: "Invalid parameters" }, 400);
  }

  // Remove .tif extension if provided
  const cleanImageName = imageName.replace(/\.tif$/i, "");

  try {
    // Get the WebP buffer from request body
    const webpBuffer = await c.req.arrayBuffer();

    if (!webpBuffer || webpBuffer.byteLength === 0) {
      return c.json({ success: false, error: "Empty request body" }, 400);
    }

    const r2 = new R2Manager(c.env.TIFF_STORAGE, c.env.THUMBNAIL_STORAGE);

    // Store in R2 cache
    await r2.putWebP(cleanImageName, layerId, webpBuffer);

    console.log(
      `Cached client-converted WebP for ${cleanImageName}: ${(webpBuffer.byteLength / 1024 / 1024).toFixed(2)}MB`,
    );

    return c.json({
      success: true,
      message: "WebP cached successfully",
      size: webpBuffer.byteLength,
    });
  } catch (error) {
    console.error(`Error caching WebP for ${cleanImageName}:`, error);
    return c.json(
      {
        success: false,
        error: "Failed to cache WebP",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// WebP conversion endpoint - converts TIFF to WebP with caching in R2
api.get("/webp/:layerId/:imageName", async (c) => {
  const layerId = parseInt(c.req.param("layerId"));
  const imageName = c.req.param("imageName");

  if (isNaN(layerId) || !imageName) {
    return c.json({ success: false, error: "Invalid parameters" }, 400);
  }

  // Remove .tif extension if provided
  const cleanImageName = imageName.replace(/\.tif$/i, "");

  const r2 = new R2Manager(c.env.TIFF_STORAGE, c.env.THUMBNAIL_STORAGE);

  // Check if WebP is already cached in R2
  const cachedWebP = await r2.getWebP(cleanImageName, layerId);
  if (cachedWebP) {
    console.log(`WebP cache HIT for ${cleanImageName}`);
    return new Response(cachedWebP.body, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache": "HIT",
        "X-Image-Format": "webp",
      },
    });
  }

  console.log(`WebP cache MISS for ${cleanImageName}, converting from TIFF`);

  // Check if TIFF is cached
  let tiffBuffer: ArrayBuffer;
  const cachedTiff = await r2.getTiff(cleanImageName, layerId);

  if (cachedTiff) {
    console.log(`Using cached TIFF for ${cleanImageName}`);
    tiffBuffer = await cachedTiff.arrayBuffer();
  } else {
    console.log(`Fetching TIFF from ArcGIS for ${cleanImageName}`);

    // Search for the specific image by name to get download link
    const params = new URLSearchParams({
      f: "json",
      where: `IMAGE_NAME='${cleanImageName}.tif'`,
      outFields: "DOWNLOAD_LINK",
      returnGeometry: "false",
    });

    const searchResponse = await fetch(
      `${c.env.API_BASE_URL}/${layerId}/query?${params}`,
    );
    const searchData = (await searchResponse.json()) as {
      features?: Array<{ attributes: { DOWNLOAD_LINK?: string } }>;
    };

    if (!searchData.features || searchData.features.length === 0) {
      return c.json(
        { success: false, error: "Image not found in ArcGIS" },
        404,
      );
    }

    const downloadLink = searchData.features[0].attributes.DOWNLOAD_LINK;
    if (!downloadLink) {
      return c.json(
        { success: false, error: "No download link available" },
        404,
      );
    }

    // Download from ArcGIS
    const tiffResponse = await fetch(downloadLink);
    if (!tiffResponse.ok) {
      return c.json(
        { success: false, error: "Failed to download TIFF from ArcGIS" },
        502,
      );
    }

    tiffBuffer = await tiffResponse.arrayBuffer();

    // Cache the TIFF for future use
    await r2.putTiff(cleanImageName, layerId, tiffBuffer);
  }

  try {
    // Convert TIFF to WebP with high quality (95)
    // Optional: Add maxWidth/maxHeight for mobile optimization
    const webpBuffer = await convertTiffToWebP(tiffBuffer, {
      quality: 95, // High quality to preserve details
    });

    // Cache the WebP in R2
    await r2.putWebP(cleanImageName, layerId, webpBuffer);

    const originalSize = tiffBuffer.byteLength;
    const webpSize = webpBuffer.byteLength;
    const reduction = ((1 - webpSize / originalSize) * 100).toFixed(1);

    console.log(
      `Converted ${cleanImageName}: ${(originalSize / 1024 / 1024).toFixed(2)}MB TIFF → ${(webpSize / 1024 / 1024).toFixed(2)}MB WebP (${reduction}% reduction)`,
    );

    // Return WebP to user
    return new Response(webpBuffer, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Cache": "MISS",
        "X-Image-Format": "webp",
        "X-Original-Size": originalSize.toString(),
        "X-Converted-Size": webpSize.toString(),
        "X-Size-Reduction": `${reduction}%`,
      },
    });
  } catch (error) {
    console.error(
      `Error converting TIFF to WebP for ${cleanImageName}:`,
      error,
    );
    return c.json(
      {
        success: false,
        error: "Failed to convert image to WebP",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// Thumbnail proxy endpoint - downloads and caches thumbnails from ArcGIS
api.get("/thumbnail/:layerId/:imageName", async (c) => {
  const layerId = parseInt(c.req.param("layerId"));
  const imageName = c.req.param("imageName");

  if (isNaN(layerId) || !imageName) {
    return c.json({ success: false, error: "Invalid parameters" }, 400);
  }

  // Remove .jpg extension if provided
  const cleanImageName = imageName.replace(/\.jpg$/i, "");

  const r2 = new R2Manager(c.env.TIFF_STORAGE, c.env.THUMBNAIL_STORAGE);

  // Check if already cached
  const cached = await r2.getThumbnail(cleanImageName, layerId);
  if (cached) {
    return new Response(cached.body, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
        "X-Cache": "HIT",
      },
    });
  }

  // Search for the specific image by name to get thumbnail link
  const params = new URLSearchParams({
    f: "json",
    where: `IMAGE_NAME='${cleanImageName}.tif'`,
    outFields: "THUMBNAIL_LINK",
    returnGeometry: "false",
  });

  const searchResponse = await fetch(
    `${c.env.API_BASE_URL}/${layerId}/query?${params}`,
  );
  const searchData = (await searchResponse.json()) as {
    features?: Array<{ attributes: { THUMBNAIL_LINK?: string } }>;
  };

  if (!searchData.features || searchData.features.length === 0) {
    return c.json({ success: false, error: "Image not found in ArcGIS" }, 404);
  }

  const thumbnailLink = searchData.features[0].attributes.THUMBNAIL_LINK;
  if (!thumbnailLink) {
    return c.json(
      { success: false, error: "No thumbnail link available" },
      404,
    );
  }

  // Download from ArcGIS
  const thumbResponse = await fetch(thumbnailLink);
  if (!thumbResponse.ok) {
    return c.json(
      { success: false, error: "Failed to download thumbnail from ArcGIS" },
      502,
    );
  }

  // Read the response as ArrayBuffer for caching
  const thumbBuffer = await thumbResponse.arrayBuffer();

  // Store in R2
  await r2.putThumbnail(cleanImageName, layerId, thumbBuffer);

  // Return to user
  return new Response(thumbBuffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000",
      "X-Cache": "MISS",
    },
  });
});

// Optimized image endpoint - serves web-optimized images using Cloudflare's Image Resizing
// This endpoint uses Cloudflare's Image Resizing to convert and optimize TIFF images on-the-fly
api.get("/image/:layerId/:imageName", async (c) => {
  const layerId = parseInt(c.req.param("layerId"));
  const imageName = c.req.param("imageName");

  // Get optional transformation parameters
  const width = c.req.query("width")
    ? parseInt(c.req.query("width")!)
    : undefined;
  const height = c.req.query("height")
    ? parseInt(c.req.query("height")!)
    : undefined;
  const quality = c.req.query("quality")
    ? parseInt(c.req.query("quality")!)
    : 100; // Default to maximum quality
  const format = c.req.query("format") || "auto"; // auto, webp, jpeg, png

  if (isNaN(layerId) || !imageName) {
    return c.json({ success: false, error: "Invalid parameters" }, 400);
  }

  // Remove .tif extension if provided
  const cleanImageName = imageName.replace(/\.tif$/i, "");

  // Search for the specific image by name to get download link
  const params = new URLSearchParams({
    f: "json",
    where: `IMAGE_NAME='${cleanImageName}.tif'`,
    outFields: "DOWNLOAD_LINK,THUMBNAIL_LINK",
    returnGeometry: "false",
  });

  const searchResponse = await fetch(
    `${c.env.API_BASE_URL}/${layerId}/query?${params}`,
  );
  const searchData = (await searchResponse.json()) as {
    features?: Array<{ attributes: { THUMBNAIL_LINK?: string } }>;
  };

  if (!searchData.features || searchData.features.length === 0) {
    return c.json({ success: false, error: "Image not found in ArcGIS" }, 404);
  }

  // Use THUMBNAIL_LINK for Image Resizing (JPEG format works with Cloudflare Image Resizing)
  // Note: DOWNLOAD_LINK returns TIFF which Image Resizing doesn't support
  const sourceLink = searchData.features[0].attributes.THUMBNAIL_LINK;

  if (!sourceLink) {
    return c.json(
      { success: false, error: "No thumbnail link available" },
      404,
    );
  }

  // Build Image Resizing options
  const resizeOptions: Record<string, string> = {
    format: format,
    quality: quality.toString(),
  };

  if (width) resizeOptions.width = width.toString();
  if (height) resizeOptions.height = height.toString();
  if (width || height) resizeOptions.fit = "scale-down"; // Preserve aspect ratio

  // Apply Cloudflare Image Resizing
  // Note: This requires the "cf" property which is only available on Cloudflare Workers
  // We use THUMBNAIL_LINK (JPEG) instead of DOWNLOAD_LINK (TIFF) because Image Resizing only supports JPEG, PNG, GIF, WebP
  const optimizedResponse = await fetch(sourceLink, {
    cf: {
      image: resizeOptions as any,
    },
  });

  if (!optimizedResponse.ok) {
    return c.json({ success: false, error: "Failed to optimize image" }, 502);
  }

  // Return optimized image
  return new Response(optimizedResponse.body, {
    headers: {
      "Content-Type":
        optimizedResponse.headers.get("Content-Type") || "image/jpeg",
      "Content-Disposition": "inline", // Display inline, not as download
      "Cache-Control": "public, max-age=31536000",
      "X-Optimized": "true",
    },
  });
});

// Temporary TIF proxy endpoint - serves files from R2 for ConvertHub
api.get("/temp-tiff/:key", async (c) => {
  const key = c.req.param("key");

  try {
    const file = await c.env.TIFF_STORAGE.get(`temp/${key}`);
    if (!file) {
      return c.json({ success: false, error: "File not found" }, 404);
    }

    return new Response(file.body, {
      headers: {
        "Content-Type": "image/tiff",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return c.json({ success: false, error: "Failed to serve file" }, 500);
  }
});

// ConvertHub proxy endpoint - converts TIFF to WEBP using ConvertHub API v2
api.post("/convert/webp", async (c) => {
  try {
    const body = (await c.req.json()) as { tiffUrl?: string };
    const { tiffUrl } = body;

    if (!tiffUrl) {
      return c.json({ success: false, error: "Missing tiffUrl" }, 400);
    }

    const CONVERTHUB_API_KEY =
      c.env.CONVERTHUB_API_KEY ||
      "105|JtAffUYt5zBXC6JpXLL2lxn4nrLvJQbTLMAwScCd1bd830cb";
    const CONVERTHUB_API_BASE = "https://api.converthub.com/v2";
    const WORKER_BASE_URL = "https://tas-aerial-browser.awhobbs.workers.dev";

    // Step 0: Proxy the TIF through Worker (bypasses anti-bot, auth, redirects, domain-blocking)
    console.log(`Proxying TIF from: ${tiffUrl}`);
    const tiffResponse = await fetch(tiffUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Cloudflare-Worker/1.0)",
      },
    });

    if (!tiffResponse.ok) {
      return c.json(
        {
          success: false,
          error: `Failed to fetch TIF: ${tiffResponse.status} ${tiffResponse.statusText}`,
        },
        502,
      );
    }

    // Read the TIF file
    const tiffBuffer = await tiffResponse.arrayBuffer();
    console.log(
      `Fetched TIF: ${(tiffBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`,
    );

    // Upload to R2 temporarily
    const tempKey = `temp/${Date.now()}-${Math.random().toString(36).substring(7)}.tif`;
    await c.env.TIFF_STORAGE.put(tempKey, tiffBuffer, {
      httpMetadata: {
        contentType: "image/tiff",
      },
    });
    console.log(`Uploaded TIF to R2: ${tempKey}`);

    // Create proxy URL that ConvertHub can access
    const proxyUrl = `${WORKER_BASE_URL}/api/temp-tiff/${tempKey.split("/").pop()}`;

    // 1. Start ConvertHub Job using proxy URL
    console.log(`Starting conversion: ${proxyUrl} → webp`);
    const startResponse = await fetch(`${CONVERTHUB_API_BASE}/convert-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONVERTHUB_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_url: proxyUrl,
        target_format: "webp",
        output_filename: "converted.webp",
      }),
    });

    if (!startResponse.ok) {
      let errorText = "";
      try {
        const errorJson = (await startResponse.json()) as
          | { message?: string; error?: string }
          | unknown;
        if (typeof errorJson === "object" && errorJson !== null) {
          const err = errorJson as { message?: string; error?: string };
          errorText = err.message || err.error || JSON.stringify(errorJson);
        } else {
          errorText = JSON.stringify(errorJson);
        }
      } catch {
        errorText = await startResponse.text();
      }
      return c.json(
        {
          success: false,
          error: `Failed to start conversion: ${startResponse.status} - ${errorText}`,
        },
        500,
      );
    }

    const startJson = (await startResponse.json()) as {
      success?: boolean;
      job_id?: string;
      status?: string;
    };

    if (!startJson.success || !startJson.job_id) {
      return c.json(
        {
          success: false,
          error: `Invalid response from ConvertHub: ${JSON.stringify(startJson)}`,
        },
        500,
      );
    }

    const jobId = startJson.job_id;
    console.log(`Conversion job started: ${jobId}`);

    // 2. Poll until completed
    let status = startJson.status || "processing";
    const maxPollAttempts = 60; // 5 minutes max
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      if (status === "completed") {
        break;
      }
      if (status === "failed") {
        return c.json({ success: false, error: "Conversion job failed" }, 500);
      }

      // Wait before polling (skip wait on first iteration)
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      const pollResponse = await fetch(`${CONVERTHUB_API_BASE}/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${CONVERTHUB_API_KEY}`,
        },
      });

      if (!pollResponse.ok) {
        return c.json(
          {
            success: false,
            error: `Failed to check job status: ${pollResponse.status}`,
          },
          500,
        );
      }

      const pollJson = (await pollResponse.json()) as { status?: string };
      status = pollJson.status || "unknown";
      console.log(
        `Job ${jobId} status: ${status} (attempt ${attempt + 1}/${maxPollAttempts})`,
      );

      if (status === "completed") {
        break;
      }
      if (status === "failed") {
        return c.json({ success: false, error: "Conversion job failed" }, 500);
      }
    }

    if (status !== "completed") {
      return c.json(
        {
          success: false,
          error: `Conversion timed out after ${maxPollAttempts} attempts. Last status: ${status}`,
        },
        500,
      );
    }

    // 3. Get download URL
    console.log(`Job ${jobId} completed, fetching download URL`);
    const downloadResponse = await fetch(
      `${CONVERTHUB_API_BASE}/jobs/${jobId}/download`,
      {
        headers: {
          Authorization: `Bearer ${CONVERTHUB_API_KEY}`,
        },
      },
    );

    if (!downloadResponse.ok) {
      return c.json(
        {
          success: false,
          error: `Failed to get download URL: ${downloadResponse.status}`,
        },
        500,
      );
    }

    const downloadJson = (await downloadResponse.json()) as {
      success?: boolean;
      download_url?: string;
      filename?: string;
    };

    if (!downloadJson.success || !downloadJson.download_url) {
      return c.json(
        {
          success: false,
          error: `Invalid download response: ${JSON.stringify(downloadJson)}`,
        },
        500,
      );
    }

    console.log(`Download URL: ${downloadJson.download_url}`);

    // 4. Clean up temporary R2 file (async, don't wait)
    c.env.TIFF_STORAGE.delete(tempKey).catch((err: Error) => {
      console.error(`Failed to delete temp file ${tempKey}:`, err);
    });

    // 5. Return download URL to frontend
    return c.json({
      success: true,
      downloadUrl: downloadJson.download_url,
      filename: downloadJson.filename || "converted.webp",
    });
  } catch (error) {
    console.error("ConvertHub conversion error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to convert image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// ConvertHub proxy endpoint - converts TIFF to PNG using ConvertHub API v2
api.post("/convert/png", async (c) => {
  try {
    const body = (await c.req.json()) as { tiffUrl?: string };
    const { tiffUrl } = body;

    if (!tiffUrl) {
      return c.json({ success: false, error: "Missing tiffUrl" }, 400);
    }

    const CONVERTHUB_API_KEY =
      c.env.CONVERTHUB_API_KEY ||
      "105|JtAffUYt5zBXC6JpXLL2lxn4nrLvJQbTLMAwScCd1bd830cb";
    const CONVERTHUB_API_BASE = "https://api.converthub.com/v2";
    const WORKER_BASE_URL = "https://tas-aerial-browser.awhobbs.workers.dev";

    // Step 0: Proxy the TIF through Worker (bypasses anti-bot, auth, redirects, domain-blocking)
    console.log(`Proxying TIF from: ${tiffUrl}`);
    const tiffResponse = await fetch(tiffUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Cloudflare-Worker/1.0)",
      },
    });

    if (!tiffResponse.ok) {
      return c.json(
        {
          success: false,
          error: `Failed to fetch TIF: ${tiffResponse.status} ${tiffResponse.statusText}`,
        },
        502,
      );
    }

    // Read the TIF file
    const tiffBuffer = await tiffResponse.arrayBuffer();
    console.log(
      `Fetched TIF: ${(tiffBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`,
    );

    // Upload to R2 temporarily
    const tempKey = `temp/${Date.now()}-${Math.random().toString(36).substring(7)}.tif`;
    await c.env.TIFF_STORAGE.put(tempKey, tiffBuffer, {
      httpMetadata: {
        contentType: "image/tiff",
      },
    });
    console.log(`Uploaded TIF to R2: ${tempKey}`);

    // Create proxy URL that ConvertHub can access
    const proxyUrl = `${WORKER_BASE_URL}/api/temp-tiff/${tempKey.split("/").pop()}`;

    // 1. Start ConvertHub Job using proxy URL
    console.log(`Starting conversion: ${proxyUrl} → png`);
    const startResponse = await fetch(`${CONVERTHUB_API_BASE}/convert-url`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONVERTHUB_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_url: proxyUrl,
        target_format: "png",
        output_filename: "converted.png",
      }),
    });

    if (!startResponse.ok) {
      let errorText = "";
      try {
        const errorJson = (await startResponse.json()) as
          | { message?: string; error?: string }
          | unknown;
        if (typeof errorJson === "object" && errorJson !== null) {
          const err = errorJson as { message?: string; error?: string };
          errorText = err.message || err.error || JSON.stringify(errorJson);
        } else {
          errorText = JSON.stringify(errorJson);
        }
      } catch {
        errorText = await startResponse.text();
      }
      return c.json(
        {
          success: false,
          error: `Failed to start conversion: ${startResponse.status} - ${errorText}`,
        },
        500,
      );
    }

    const startJson = (await startResponse.json()) as {
      success?: boolean;
      job_id?: string;
      status?: string;
    };

    if (!startJson.success || !startJson.job_id) {
      return c.json(
        {
          success: false,
          error: `Invalid response from ConvertHub: ${JSON.stringify(startJson)}`,
        },
        500,
      );
    }

    const jobId = startJson.job_id;
    console.log(`Conversion job started: ${jobId}`);

    // 2. Poll until completed
    let status = startJson.status || "processing";
    const maxPollAttempts = 60; // 5 minutes max
    const pollInterval = 2000; // 2 seconds

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      if (status === "completed") {
        break;
      }
      if (status === "failed") {
        return c.json({ success: false, error: "Conversion job failed" }, 500);
      }

      // Wait before polling (skip wait on first iteration)
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      const pollResponse = await fetch(`${CONVERTHUB_API_BASE}/jobs/${jobId}`, {
        headers: {
          Authorization: `Bearer ${CONVERTHUB_API_KEY}`,
        },
      });

      if (!pollResponse.ok) {
        return c.json(
          {
            success: false,
            error: `Failed to check job status: ${pollResponse.status}`,
          },
          500,
        );
      }

      const pollJson = (await pollResponse.json()) as { status?: string };
      status = pollJson.status || "unknown";
      console.log(
        `Job ${jobId} status: ${status} (attempt ${attempt + 1}/${maxPollAttempts})`,
      );

      if (status === "completed") {
        break;
      }
      if (status === "failed") {
        return c.json({ success: false, error: "Conversion job failed" }, 500);
      }
    }

    if (status !== "completed") {
      return c.json(
        {
          success: false,
          error: `Conversion timed out after ${maxPollAttempts} attempts. Last status: ${status}`,
        },
        500,
      );
    }

    // 3. Get download URL
    console.log(`Job ${jobId} completed, fetching download URL`);
    const downloadResponse = await fetch(
      `${CONVERTHUB_API_BASE}/jobs/${jobId}/download`,
      {
        headers: {
          Authorization: `Bearer ${CONVERTHUB_API_KEY}`,
        },
      },
    );

    if (!downloadResponse.ok) {
      return c.json(
        {
          success: false,
          error: `Failed to get download URL: ${downloadResponse.status}`,
        },
        500,
      );
    }

    const downloadJson = (await downloadResponse.json()) as {
      success?: boolean;
      download_url?: string;
      filename?: string;
    };

    if (!downloadJson.success || !downloadJson.download_url) {
      return c.json(
        {
          success: false,
          error: `Invalid download response: ${JSON.stringify(downloadJson)}`,
        },
        500,
      );
    }

    console.log(`Download URL: ${downloadJson.download_url}`);

    // 4. Clean up temporary R2 file (async, don't wait)
    c.env.TIFF_STORAGE.delete(tempKey).catch((err: Error) => {
      console.error(`Failed to delete temp file ${tempKey}:`, err);
    });

    // 5. Return download URL to frontend
    return c.json({
      success: true,
      downloadUrl: downloadJson.download_url,
      filename: downloadJson.filename || "converted.png",
    });
  } catch (error) {
    console.error("ConvertHub conversion error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to convert image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});

// TIFF Conversion Service - Health Check
api.get("/convert-tiff-health", async (c) => {
  try {
    const CONVERSION_SERVICE_URL = c.env.TIFF_CONVERSION_SERVICE_URL;

    if (!CONVERSION_SERVICE_URL) {
      return c.json(
        {
          success: false,
          error: "TIFF conversion service URL not configured",
          available: false,
        },
        503,
      );
    }

    const response = await fetch(`${CONVERSION_SERVICE_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (!response.ok) {
      return c.json(
        {
          success: false,
          error: `Service returned ${response.status}`,
          available: false,
        },
        502,
      );
    }

    const data = (await response.json()) as {
      status?: string;
      timestamp?: string;
    };
    return c.json({
      success: true,
      status: data.status,
      timestamp: data.timestamp,
      available: true,
    });
  } catch (error) {
    console.error("TIFF conversion service health check error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Service unavailable",
        available: false,
      },
      503,
    );
  }
});

// TIFF Conversion Service - Convert from URL
api.post("/convert-tiff-url", async (c) => {
  try {
    const CONVERSION_SERVICE_URL = c.env.TIFF_CONVERSION_SERVICE_URL;

    if (!CONVERSION_SERVICE_URL) {
      return c.json(
        {
          success: false,
          error: "TIFF conversion service URL not configured",
        },
        503,
      );
    }

    const body = (await c.req.json()) as { url?: string };
    const { url } = body;

    if (!url) {
      return c.json({ success: false, error: "Missing url" }, 400);
    }

    // Forward request to conversion service
    console.log(
      `Calling conversion service: ${CONVERSION_SERVICE_URL}/convert-url`,
    );
    let response: Response;
    try {
      response = await fetch(`${CONVERSION_SERVICE_URL}/convert-url`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
        signal: AbortSignal.timeout(600000), // 10 minutes timeout
      });
    } catch (fetchError) {
      console.error("Fetch error details:", fetchError);
      throw new Error(
        `Failed to connect to conversion service at ${CONVERSION_SERVICE_URL}: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
      );
    }

    if (!response.ok) {
      let errorText = "";
      try {
        const errorJson = (await response.json()) as { error?: string };
        errorText = errorJson.error || `HTTP ${response.status}`;
      } catch {
        errorText = (await response.text()) || `HTTP ${response.status}`;
      }
      const statusCode =
        response.status >= 500 ? 502 : response.status >= 400 ? 400 : 500;
      return c.json(
        {
          success: false,
          error: errorText,
        },
        statusCode,
      );
    }

    const data = (await response.json()) as {
      success?: boolean;
      url?: string;
      format?: string;
      originalSize?: number;
      convertedSize?: number;
      duration?: number;
      error?: string;
    };

    if (data.success) {
      // Return a proxy URL instead of the direct R2 URL to avoid CORS issues
      const baseUrl = c.req.url.split("/api")[0];
      const proxyUrl = `${baseUrl}/api/convert-tiff-proxy?url=${encodeURIComponent(data.url || "")}`;
      return c.json({
        success: true,
        url: proxyUrl, // Use proxy URL instead of direct R2 URL
        format: data.format,
        originalSize: data.originalSize,
        convertedSize: data.convertedSize,
        duration: data.duration,
      });
    } else {
      return c.json(
        {
          success: false,
          error: data.error || "Conversion failed",
        },
        500,
      );
    }
  } catch (error) {
    console.error("TIFF conversion service error:", error);
    const CONVERSION_SERVICE_URL =
      c.env.TIFF_CONVERSION_SERVICE_URL || "https://tiff.awhq.uk";
    if (error instanceof Error && error.name === "AbortError") {
      return c.json(
        {
          success: false,
          error: "Conversion timed out (10 minutes)",
        },
        500,
      );
    }
    // Provide more detailed error information
    const errorMessage =
      error instanceof Error ? error.message : "Conversion failed";
    const isNetworkError =
      error instanceof Error &&
      (error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.name === "TypeError");

    return c.json(
      {
        success: false,
        error: isNetworkError
          ? `Network error connecting to conversion service: ${errorMessage}. Please check if the service is running at ${CONVERSION_SERVICE_URL}`
          : errorMessage,
      },
      500,
    );
  }
});

// TIFF Conversion Service - Convert from File Upload
api.post("/convert-tiff-upload", async (c) => {
  try {
    const CONVERSION_SERVICE_URL = c.env.TIFF_CONVERSION_SERVICE_URL;

    if (!CONVERSION_SERVICE_URL) {
      return c.json(
        {
          success: false,
          error: "TIFF conversion service URL not configured",
        },
        503,
      );
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return c.json({ success: false, error: "No file uploaded" }, 400);
    }

    // Validate file type
    const fileName = file.name.toLowerCase();
    if (!fileName.match(/\.(tif|tiff)$/)) {
      return c.json(
        {
          success: false,
          error: "Only TIFF files are allowed",
        },
        400,
      );
    }

    // Validate file size (1GB limit)
    if (file.size > 1024 * 1024 * 1024) {
      return c.json(
        {
          success: false,
          error: "File size exceeds 1GB limit",
        },
        400,
      );
    }

    // Create new FormData to forward to conversion service
    const forwardFormData = new FormData();
    forwardFormData.append("file", file);

    // Forward request to conversion service
    console.log(
      `Calling conversion service: ${CONVERSION_SERVICE_URL}/convert-upload`,
    );
    let response: Response;
    try {
      response = await fetch(`${CONVERSION_SERVICE_URL}/convert-upload`, {
        method: "POST",
        body: forwardFormData,
        signal: AbortSignal.timeout(600000), // 10 minutes timeout
      });
    } catch (fetchError) {
      console.error("Fetch error details:", fetchError);
      throw new Error(
        `Failed to connect to conversion service at ${CONVERSION_SERVICE_URL}: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
      );
    }

    if (!response.ok) {
      let errorText = "";
      try {
        const errorJson = (await response.json()) as { error?: string };
        errorText = errorJson.error || `HTTP ${response.status}`;
      } catch {
        errorText = (await response.text()) || `HTTP ${response.status}`;
      }
      const statusCode =
        response.status >= 500 ? 502 : response.status >= 400 ? 400 : 500;
      return c.json(
        {
          success: false,
          error: errorText,
        },
        statusCode,
      );
    }

    const data = (await response.json()) as {
      success?: boolean;
      url?: string;
      format?: string;
      originalSize?: number;
      convertedSize?: number;
      duration?: number;
      error?: string;
    };

    if (data.success) {
      // Return a proxy URL instead of the direct R2 URL to avoid CORS issues
      const baseUrl = c.req.url.split("/api")[0];
      const proxyUrl = `${baseUrl}/api/convert-tiff-proxy?url=${encodeURIComponent(data.url || "")}`;
      return c.json({
        success: true,
        url: proxyUrl, // Use proxy URL instead of direct R2 URL
        format: data.format,
        originalSize: data.originalSize,
        convertedSize: data.convertedSize,
        duration: data.duration,
      });
    } else {
      return c.json(
        {
          success: false,
          error: data.error || "Conversion failed",
        },
        500,
      );
    }
  } catch (error) {
    console.error("TIFF conversion service error:", error);
    const CONVERSION_SERVICE_URL =
      c.env.TIFF_CONVERSION_SERVICE_URL || "https://tiff.awhq.uk";
    if (error instanceof Error && error.name === "AbortError") {
      return c.json(
        {
          success: false,
          error: "Conversion timed out (10 minutes)",
        },
        500,
      );
    }
    // Provide more detailed error information
    const errorMessage =
      error instanceof Error ? error.message : "Conversion failed";
    const isNetworkError =
      error instanceof Error &&
      (error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.name === "TypeError");

    return c.json(
      {
        success: false,
        error: isNetworkError
          ? `Network error connecting to conversion service: ${errorMessage}. Please check if the service is running at ${CONVERSION_SERVICE_URL}`
          : errorMessage,
      },
      500,
    );
  }
});

// TIFF Conversion Service - Proxy endpoint to fetch converted images with CORS headers
api.get("/convert-tiff-proxy", async (c) => {
  try {
    const imageUrl = c.req.query("url");

    if (!imageUrl) {
      return c.json({ success: false, error: "Missing url parameter" }, 400);
    }

    // Fetch the converted image from R2
    const imageResponse = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Cloudflare-Worker/1.0)",
      },
    });

    if (!imageResponse.ok) {
      return c.json(
        {
          success: false,
          error: `Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`,
        },
        502,
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();

    // Determine content type from response
    const contentType =
      imageResponse.headers.get("Content-Type") || "image/webp";

    // Return the image with CORS headers
    return new Response(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("TIFF conversion proxy error:", error);
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to proxy image",
      },
      500,
    );
  }
});

// ============================================================================
// AI-Enhanced Search Endpoints
// ============================================================================

/**
 * AI-enhanced geocoding results
 * Takes raw Nominatim results and improves formatting/ranking using AI
 */
api.post("/ai/enhance-search", async (c) => {
  try {
    const body = (await c.req.json()) as {
      query: string;
      results: GeocodingResult[];
    };

    const { query, results } = body;

    if (!query || !results || !Array.isArray(results)) {
      return c.json(
        {
          success: false,
          error: "Missing query or results",
        },
        400,
      );
    }

    const aiService = new AIService(c.env.AI);
    const enhanced = await aiService.enhanceSearchResults(query, results);

    return c.json({
      success: true,
      data: enhanced,
    });
  } catch (error) {
    console.error("AI enhance search error:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to enhance search results",
      },
      500,
    );
  }
});

/**
 * AI natural language search parser
 * Parses queries like "Find images of 78 New Town Rd between 1920-1950 in high resolution"
 */
api.post("/ai/parse-search", async (c) => {
  try {
    const body = (await c.req.json()) as { query: string };
    const { query } = body;

    if (!query) {
      return c.json(
        {
          success: false,
          error: "Missing query",
        },
        400,
      );
    }

    const aiService = new AIService(c.env.AI);
    const parsed = await aiService.parseNaturalLanguageSearch(query);

    return c.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error("AI parse search error:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to parse search query",
      },
      500,
    );
  }
});

/**
 * AI search summary generator
 * Generates helpful context about search results
 */
api.post("/ai/search-summary", async (c) => {
  try {
    const body = (await c.req.json()) as {
      query: string;
      resultCount: number;
      dateRange?: { earliest?: string; latest?: string };
    };

    const { query, resultCount, dateRange } = body;

    if (!query || resultCount === undefined) {
      return c.json(
        {
          success: false,
          error: "Missing query or resultCount",
        },
        400,
      );
    }

    const aiService = new AIService(c.env.AI);
    const summary = await aiService.generateSearchSummary(
      query,
      resultCount,
      dateRange,
    );

    return c.json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    console.error("AI search summary error:", error);
    return c.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to generate summary",
      },
      500,
    );
  }
});

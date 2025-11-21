import { Hono } from "hono";
import { ArcGISClient } from "../lib/arcgis";
import { CacheManager } from "../lib/cache";
import { R2Manager } from "../lib/r2";
import { convertTiffToWebP, estimateSizeReduction } from "../lib/imageConversion";
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
  layerId: number
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
  }
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
    minScale: c.req.query("minScale") ? parseFloat(c.req.query("minScale")!) : undefined,
    maxScale: c.req.query("maxScale") ? parseFloat(c.req.query("maxScale")!) : undefined,
    imageTypes: c.req.query("imageTypes")?.split(","),
  };

  const client = new ArcGISClient(c.env.API_BASE_URL);
  const r2 = new R2Manager(c.env.TIFF_STORAGE, c.env.THUMBNAIL_STORAGE);

  const results = await Promise.all(
    layers.map(async (layerId) => {
      const features = await client.queryByPoint(layerId, lon, lat);
      return features.map((f: any) => enhancePhoto(f, layerId));
    })
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
    minScale: c.req.query("minScale") ? parseFloat(c.req.query("minScale")!) : undefined,
    maxScale: c.req.query("maxScale") ? parseFloat(c.req.query("maxScale")!) : undefined,
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
        north
      );
      return features.map((f: any) => enhancePhoto(f, layerId));
    })
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
    `${c.env.API_BASE_URL}/${layerId}/query?${params}`
  );
  const searchData = await searchResponse.json() as { features?: Array<{ attributes: { DOWNLOAD_LINK?: string } }> };

  if (!searchData.features || searchData.features.length === 0) {
    return c.json(
      { success: false, error: "Image not found in ArcGIS" },
      404
    );
  }

  const downloadLink = searchData.features[0].attributes.DOWNLOAD_LINK;
  if (!downloadLink) {
    return c.json(
      { success: false, error: "No download link available" },
      404
    );
  }

  // Download from ArcGIS
  const tiffResponse = await fetch(downloadLink);
  if (!tiffResponse.ok) {
    return c.json(
      { success: false, error: "Failed to download from ArcGIS" },
      502
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
      `${c.env.API_BASE_URL}/${layerId}/query?${params}`
    );
    const searchData = await searchResponse.json() as { features?: Array<{ attributes: { DOWNLOAD_LINK?: string } }> };

    if (!searchData.features || searchData.features.length === 0) {
      return c.json(
        { success: false, error: "Image not found in ArcGIS" },
        404
      );
    }

    const downloadLink = searchData.features[0].attributes.DOWNLOAD_LINK;
    if (!downloadLink) {
      return c.json(
        { success: false, error: "No download link available" },
        404
      );
    }

    // Download from ArcGIS
    const tiffResponse = await fetch(downloadLink);
    if (!tiffResponse.ok) {
      return c.json(
        { success: false, error: "Failed to download TIFF from ArcGIS" },
        502
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
      `Converted ${cleanImageName}: ${(originalSize / 1024 / 1024).toFixed(2)}MB TIFF → ${(webpSize / 1024 / 1024).toFixed(2)}MB WebP (${reduction}% reduction)`
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
    console.error(`Error converting TIFF to WebP for ${cleanImageName}:`, error);
    return c.json(
      {
        success: false,
        error: "Failed to convert image to WebP",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
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
    `${c.env.API_BASE_URL}/${layerId}/query?${params}`
  );
  const searchData = await searchResponse.json() as { features?: Array<{ attributes: { THUMBNAIL_LINK?: string } }> };

  if (!searchData.features || searchData.features.length === 0) {
    return c.json(
      { success: false, error: "Image not found in ArcGIS" },
      404
    );
  }

  const thumbnailLink = searchData.features[0].attributes.THUMBNAIL_LINK;
  if (!thumbnailLink) {
    return c.json(
      { success: false, error: "No thumbnail link available" },
      404
    );
  }

  // Download from ArcGIS
  const thumbResponse = await fetch(thumbnailLink);
  if (!thumbResponse.ok) {
    return c.json(
      { success: false, error: "Failed to download thumbnail from ArcGIS" },
      502
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
  const width = c.req.query("width") ? parseInt(c.req.query("width")!) : undefined;
  const height = c.req.query("height") ? parseInt(c.req.query("height")!) : undefined;
  const quality = c.req.query("quality") ? parseInt(c.req.query("quality")!) : 100; // Default to maximum quality
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
    `${c.env.API_BASE_URL}/${layerId}/query?${params}`
  );
  const searchData = await searchResponse.json() as { features?: Array<{ attributes: { THUMBNAIL_LINK?: string } }> };

  if (!searchData.features || searchData.features.length === 0) {
    return c.json(
      { success: false, error: "Image not found in ArcGIS" },
      404
    );
  }

  // Use THUMBNAIL_LINK for Image Resizing (JPEG format works with Cloudflare Image Resizing)
  // Note: DOWNLOAD_LINK returns TIFF which Image Resizing doesn't support
  const sourceLink = searchData.features[0].attributes.THUMBNAIL_LINK;

  if (!sourceLink) {
    return c.json(
      { success: false, error: "No thumbnail link available" },
      404
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
    return c.json(
      { success: false, error: "Failed to optimize image" },
      502
    );
  }

  // Return optimized image
  return new Response(optimizedResponse.body, {
    headers: {
      "Content-Type": optimizedResponse.headers.get("Content-Type") || "image/jpeg",
      "Content-Disposition": "inline", // Display inline, not as download
      "Cache-Control": "public, max-age=31536000",
      "X-Optimized": "true",
    },
  });
});

// ConvertHub proxy endpoint - converts TIFF to WEBP using ConvertHub API
api.post("/convert/webp", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const tiffUrl = formData.get("tiffUrl") as string;

    if (!file && !tiffUrl) {
      return c.json({ success: false, error: "Either file or tiffUrl must be provided" }, 400);
    }

    const CONVERTHUB_API_KEY = c.env.CONVERTHUB_API_KEY || "105|JtAffUYt5zBXC6JpXLL2lxn4nrLvJQbTLMAwScCd1bd830cb";
    const CONVERTHUB_API_URL = "https://api.converthub.com/v1/convert";

    let tiffBlob: Blob;

    // If tiffUrl is provided, fetch the file
    if (tiffUrl) {
      const tiffResponse = await fetch(tiffUrl);
      if (!tiffResponse.ok) {
        return c.json(
          { success: false, error: `Failed to fetch TIFF: ${tiffResponse.statusText}` },
          tiffResponse.status
        );
      }
      tiffBlob = await tiffResponse.blob();
    } else if (file) {
      tiffBlob = file;
    } else {
      return c.json({ success: false, error: "No file or URL provided" }, 400);
    }

    // Convert using ConvertHub API
    // Note: ConvertHub has dimension limits, so we'll add resize parameters
    const convertFormData = new FormData();
    const fileName = file?.name || tiffUrl?.split('/').pop() || "image.tiff";
    convertFormData.append("file", tiffBlob, fileName);
    convertFormData.append("target_format", "webp");
    convertFormData.append("quality", "95"); // High quality
    
    // Add resize parameters to prevent "width or height exceeds limit" error
    // Try multiple parameter name variations as ConvertHub API format may vary
    // ConvertHub typically has a limit around 16384 pixels per dimension
    // We'll set a safe limit of 8192 pixels max per dimension
    convertFormData.append("max_width", "8192");
    convertFormData.append("max_height", "8192");
    // Also try alternative parameter names
    convertFormData.append("width", "8192");
    convertFormData.append("height", "8192");
    convertFormData.append("resize", "8192x8192");

    console.log(`Converting file to WEBP: ${fileName}, size: ${tiffBlob.size} bytes`);

    const convertResponse = await fetch(CONVERTHUB_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONVERTHUB_API_KEY}`,
      },
      body: convertFormData,
    });

    console.log(`ConvertHub response status: ${convertResponse.status}`);
    console.log(`ConvertHub response headers:`, Object.fromEntries(convertResponse.headers.entries()));

    if (!convertResponse.ok) {
      let errorText = "";
      try {
        const errorJson = await convertResponse.json();
        errorText = errorJson.message || errorJson.error || JSON.stringify(errorJson);
      } catch {
        errorText = await convertResponse.text();
      }
      return c.json(
        { success: false, error: `Conversion failed: ${convertResponse.status} - ${errorText}` },
        convertResponse.status
      );
    }

    // Check if response is JSON (with download URL) or binary (direct file)
    const contentType = convertResponse.headers.get("content-type") || "";
    let webpBlob: Blob;

    if (contentType.includes("application/json")) {
      // API returned JSON - try to extract download URL or file data
      const jsonResponse = await convertResponse.json();
      console.log("ConvertHub JSON response:", JSON.stringify(jsonResponse, null, 2));
      
      // Try various possible field names for download URL
      const downloadUrl = 
        jsonResponse.download_url || 
        jsonResponse.url || 
        jsonResponse.file_url ||
        jsonResponse.downloadUrl ||
        jsonResponse.fileUrl ||
        jsonResponse.result?.url ||
        jsonResponse.data?.url ||
        jsonResponse.file?.url;
      
      // Check if there's base64 encoded file data
      const base64Data = 
        jsonResponse.data ||
        jsonResponse.file ||
        jsonResponse.content ||
        jsonResponse.result?.data;
      
      if (downloadUrl) {
        // Fetch the converted file from URL
        const downloadResponse = await fetch(downloadUrl);
        if (!downloadResponse.ok) {
          return c.json(
            { success: false, error: `Failed to download converted file: ${downloadResponse.statusText}` },
            downloadResponse.status
          );
        }
        webpBlob = await downloadResponse.blob();
      } else if (base64Data && typeof base64Data === 'string' && base64Data.startsWith('data:')) {
        // Handle data URL
        const response = await fetch(base64Data);
        webpBlob = await response.blob();
      } else if (base64Data && typeof base64Data === 'string') {
        // Handle base64 string
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        webpBlob = new Blob([bytes], { type: 'image/webp' });
      } else {
        // Log the full response for debugging
        console.error("Unexpected ConvertHub response format:", jsonResponse);
        return c.json({ 
          success: false, 
          error: "Unexpected API response format",
          details: "No download URL or file data found in response",
          response: jsonResponse
        }, 500);
      }
    } else {
      // Direct binary response
      webpBlob = await convertResponse.blob();
    }

    // Return the converted WEBP file
    return new Response(webpBlob, {
      headers: {
        "Content-Type": "image/webp",
        "Content-Disposition": 'attachment; filename="converted.webp"',
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("ConvertHub conversion error:", error);
    return c.json(
      {
        success: false,
        error: "Failed to convert image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

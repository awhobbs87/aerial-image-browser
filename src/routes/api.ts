import { Hono } from "hono";
import { ArcGISClient } from "../lib/arcgis";
import { CacheManager } from "../lib/cache";
import { R2Manager } from "../lib/r2";
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
  const searchData = await searchResponse.json();

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
  const searchData = await searchResponse.json();

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

// NOTE: This old endpoint has been replaced by the Photon-based conversion endpoint in convert.ts
// The old endpoint used Cloudflare Image Resizing but could only work with thumbnails (JPEG)
// The new Photon endpoint can handle TIFFs directly and convert them to WebP/PNG/JPEG
/*
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
  const searchData = await searchResponse.json();

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
*/

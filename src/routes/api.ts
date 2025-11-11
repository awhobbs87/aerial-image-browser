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
    layerId,
    layerType,
    dateFormatted: formatDate(attrs.FLY_DATE || attrs.CAPTURE_START_DATE),
    scaleFormatted: attrs.SCALE ? `1:${attrs.SCALE.toLocaleString()}` : null,
  };
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

  const client = new ArcGISClient(c.env.API_BASE_URL);
  const r2 = new R2Manager(c.env.TIFF_STORAGE, c.env.THUMBNAIL_STORAGE);

  const results = await Promise.all(
    layers.map(async (layerId) => {
      const features = await client.queryByPoint(layerId, lon, lat);
      return features.map((f: any) => enhancePhoto(f, layerId));
    })
  );

  const photos = results.flat() as EnhancedPhoto[];

  await Promise.all(
    photos.map(async (photo) => {
      if (photo.IMAGE_NAME) {
        photo.cached = await r2.hasTiff(photo.IMAGE_NAME, photo.layerId);
        photo.thumbnailCached = await r2.hasThumbnail(
          photo.IMAGE_NAME,
          photo.layerId
        );
      }
    })
  );

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

  const photos = results.flat() as EnhancedPhoto[];

  // Only check R2 cache status for reasonable result sets to avoid timeouts
  if (photos.length <= 100) {
    await Promise.all(
      photos.map(async (photo) => {
        if (photo.IMAGE_NAME) {
          photo.cached = await r2.hasTiff(photo.IMAGE_NAME, photo.layerId);
          photo.thumbnailCached = await r2.hasThumbnail(
            photo.IMAGE_NAME,
            photo.layerId
          );
        } else {
          photo.cached = false;
          photo.thumbnailCached = false;
        }
      })
    );
  } else {
    // For large result sets, default to false to avoid timeout
    photos.forEach((photo) => {
      photo.cached = false;
      photo.thumbnailCached = false;
    });
  }

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

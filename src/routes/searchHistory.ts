import { Hono } from "hono";
import type { Bindings } from "../types";
import { getAccessIdentity } from "../lib/auth";

/**
 * Represents a single item in a user's search history.
 */
export interface SearchHistoryItem {
  id: string;
  query: string;
  lat: number;
  lon: number;
  timestamp: number;
}

/** Maximum number of history items to retain per user */
const MAX_HISTORY_ITEMS = 20;

/** TTL for history entries: 90 days in seconds */
const HISTORY_TTL = 90 * 24 * 60 * 60;

type Variables = {
  userEmail: string;
};

export const searchHistoryRoutes = new Hono<{
  Bindings: Bindings;
  Variables: Variables;
}>();

/**
 * Middleware to extract and validate user identity from Cloudflare Access.
 * Sets userEmail in context for downstream handlers.
 */
searchHistoryRoutes.use("*", async (c, next) => {
  const identity = getAccessIdentity(c.req.raw);

  if (!identity?.email) {
    return c.json({ success: false, error: "Unauthorized" }, 401);
  }

  c.set("userEmail", identity.email);
  await next();
});

/**
 * GET / - Retrieve user's search history
 */
searchHistoryRoutes.get("/", async (c) => {
  try {
    const email = c.get("userEmail");
    const kvKey = `search-history:${email}`;

    const historyJson = await c.env.PHOTO_CACHE.get(kvKey);
    const history: SearchHistoryItem[] = historyJson
      ? JSON.parse(historyJson)
      : [];

    return c.json({ success: true, data: history });
  } catch (error) {
    console.error("Error fetching search history:", error);
    return c.json(
      { success: false, error: "Failed to fetch search history" },
      500,
    );
  }
});

/**
 * POST / - Add a new item to search history
 */
searchHistoryRoutes.post("/", async (c) => {
  try {
    const email = c.get("userEmail");
    const kvKey = `search-history:${email}`;

    const body = await c.req.json<{
      query?: string;
      lat?: number;
      lon?: number;
    }>();

    if (
      !body.query ||
      typeof body.lat !== "number" ||
      typeof body.lon !== "number"
    ) {
      return c.json(
        { success: false, error: "Missing required fields: query, lat, lon" },
        400,
      );
    }

    const { query, lat, lon } = body;

    // Load existing history
    const historyJson = await c.env.PHOTO_CACHE.get(kvKey);
    let history: SearchHistoryItem[] = historyJson
      ? JSON.parse(historyJson)
      : [];

    // Remove duplicates within ~100m (approximately 0.001 degrees)
    history = history.filter(
      (item) =>
        Math.abs(item.lat - lat) > 0.001 || Math.abs(item.lon - lon) > 0.001,
    );

    // Create new item
    const newItem: SearchHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      query,
      lat,
      lon,
      timestamp: Date.now(),
    };

    // Add to front and limit size
    history.unshift(newItem);
    history = history.slice(0, MAX_HISTORY_ITEMS);

    // Save to KV with TTL
    await c.env.PHOTO_CACHE.put(kvKey, JSON.stringify(history), {
      expirationTtl: HISTORY_TTL,
    });

    return c.json({ success: true, data: newItem });
  } catch (error) {
    console.error("Error adding to search history:", error);
    return c.json(
      { success: false, error: "Failed to add to search history" },
      500,
    );
  }
});

/**
 * DELETE /:itemId - Remove a single item from search history
 */
searchHistoryRoutes.delete("/:itemId", async (c) => {
  try {
    const email = c.get("userEmail");
    const kvKey = `search-history:${email}`;
    const itemId = c.req.param("itemId");

    // Load existing history
    const historyJson = await c.env.PHOTO_CACHE.get(kvKey);
    let history: SearchHistoryItem[] = historyJson
      ? JSON.parse(historyJson)
      : [];

    // Filter out the item
    history = history.filter((item) => item.id !== itemId);

    // Save updated history to KV
    await c.env.PHOTO_CACHE.put(kvKey, JSON.stringify(history), {
      expirationTtl: HISTORY_TTL,
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("Error deleting search history item:", error);
    return c.json(
      { success: false, error: "Failed to delete search history item" },
      500,
    );
  }
});

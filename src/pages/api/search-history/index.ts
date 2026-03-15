import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getAccessIdentity } from "@/lib/auth";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

const MAX_HISTORY_ITEMS = 20;
const HISTORY_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days
const DUPLICATE_THRESHOLD_DEGREES = 0.001; // ~100m

interface SearchHistoryItem {
  id: string;
  query: string;
  lat: number;
  lon: number;
  timestamp: number;
}

function kvKey(email: string): string {
  return `search-history:${email}`;
}

function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({ success: false, error: "Unauthorized" }),
    { status: 401, headers: JSON_HEADERS },
  );
}

async function loadHistory(email: string): Promise<SearchHistoryItem[]> {
  const json = await env.PHOTO_CACHE.get(kvKey(email));
  return json ? (JSON.parse(json) as SearchHistoryItem[]) : [];
}

async function saveHistory(
  email: string,
  history: SearchHistoryItem[],
): Promise<void> {
  await env.PHOTO_CACHE.put(kvKey(email), JSON.stringify(history), {
    expirationTtl: HISTORY_TTL_SECONDS,
  });
}

export const GET: APIRoute = async ({ request }) => {
  const identity = getAccessIdentity(request);
  if (!identity?.email) {
    return unauthorizedResponse();
  }

  try {
    const history = await loadHistory(identity.email);

    return new Response(
      JSON.stringify({ success: true, data: history }),
      { headers: JSON_HEADERS },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to fetch search history: ${message}`,
      }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  const identity = getAccessIdentity(request);
  if (!identity?.email) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { query, lat, lon } = body as {
      query: string;
      lat: number;
      lon: number;
    };

    if (!query || lat == null || lon == null) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: query, lat, lon",
        }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    const history = await loadHistory(identity.email);

    // Remove duplicates within ~100m
    const deduplicated = history.filter(
      (item) =>
        Math.abs(item.lat - lat) > DUPLICATE_THRESHOLD_DEGREES ||
        Math.abs(item.lon - lon) > DUPLICATE_THRESHOLD_DEGREES,
    );

    const newItem: SearchHistoryItem = {
      id: crypto.randomUUID(),
      query,
      lat,
      lon,
      timestamp: Date.now(),
    };

    // Prepend new item, enforce max length
    const updated = [newItem, ...deduplicated].slice(0, MAX_HISTORY_ITEMS);

    await saveHistory(identity.email, updated);

    return new Response(
      JSON.stringify({ success: true, data: newItem }),
      { status: 201, headers: JSON_HEADERS },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to save search history: ${message}`,
      }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
};

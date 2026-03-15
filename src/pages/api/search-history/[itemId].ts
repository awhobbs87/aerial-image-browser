import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getAccessIdentity } from "@/lib/auth";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;
const HISTORY_TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

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

export const DELETE: APIRoute = async ({ params, request }) => {
  const identity = getAccessIdentity(request);
  if (!identity?.email) {
    return new Response(
      JSON.stringify({ success: false, error: "Unauthorized" }),
      { status: 401, headers: JSON_HEADERS },
    );
  }

  const { itemId } = params;
  if (!itemId) {
    return new Response(
      JSON.stringify({ success: false, error: "Missing item id" }),
      { status: 400, headers: JSON_HEADERS },
    );
  }

  try {
    const key = kvKey(identity.email);
    const json = await env.PHOTO_CACHE.get(key);
    const history: SearchHistoryItem[] = json ? JSON.parse(json) : [];

    const updated = history.filter((item) => item.id !== itemId);

    if (updated.length === history.length) {
      return new Response(
        JSON.stringify({ success: false, error: "History item not found" }),
        { status: 404, headers: JSON_HEADERS },
      );
    }

    await env.PHOTO_CACHE.put(key, JSON.stringify(updated), {
      expirationTtl: HISTORY_TTL_SECONDS,
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: JSON_HEADERS },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({
        success: false,
        error: `Failed to delete history item: ${message}`,
      }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
};

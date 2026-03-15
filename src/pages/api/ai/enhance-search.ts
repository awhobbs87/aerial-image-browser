import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { AIService, type GeocodingResult } from '@/lib/ai';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { query: string; results: GeocodingResult[] };
    const { query, results } = body;

    if (!query || !results || !Array.isArray(results)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing query or results' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const aiService = new AIService(env.AI);
    const enhanced = await aiService.enhanceSearchResults(query, results);

    return new Response(
      JSON.stringify({ success: true, data: enhanced }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enhance search results',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

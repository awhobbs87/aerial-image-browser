import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { AIService } from '@/lib/ai';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as { query: string };
    const { query } = body;

    if (!query) {
      return new Response(JSON.stringify({ success: false, error: 'Missing query' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const aiService = new AIService(env.AI);
    const parsed = await aiService.parseNaturalLanguageSearch(query);

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse search query',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

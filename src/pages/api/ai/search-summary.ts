import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { AIService } from '@/lib/ai';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as {
      query: string;
      resultCount: number;
      dateRange?: { earliest?: string; latest?: string };
    };
    const { query, resultCount, dateRange } = body;

    if (!query || resultCount === undefined) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing query or resultCount' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const aiService = new AIService(env.AI);
    const summary = await aiService.generateSearchSummary(query, resultCount, dateRange);

    return new Response(JSON.stringify({ success: true, data: { summary } }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate summary',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

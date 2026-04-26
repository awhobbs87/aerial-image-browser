import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAccessIdentity } from '@/lib/auth';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const DELETE: APIRoute = async ({ params, request }) => {
  const identity = getAccessIdentity(request);
  if (!identity?.email) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: JSON_HEADERS,
    });
  }

  const { id } = params;
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'Missing favorite id' }), {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  try {
    const result = await env.PHOTOS_DB.prepare('DELETE FROM favorites WHERE id = ? AND user_id = ?')
      .bind(id, identity.email)
      .run();

    if (result.meta.changes === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Favorite not found' }), {
        status: 404,
        headers: JSON_HEADERS,
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: JSON_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: `Failed to delete favorite: ${message}` }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
};

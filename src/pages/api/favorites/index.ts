import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getAccessIdentity } from '@/lib/auth';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

function unauthorizedResponse(): Response {
  return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
    status: 401,
    headers: JSON_HEADERS,
  });
}

export const GET: APIRoute = async ({ request }) => {
  const identity = getAccessIdentity(request);
  if (!identity?.email) {
    return unauthorizedResponse();
  }

  try {
    const result = await env.PHOTOS_DB.prepare(
      'SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
    )
      .bind(identity.email)
      .all();

    return new Response(JSON.stringify({ success: true, data: result.results }), {
      headers: JSON_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: `Failed to fetch favorites: ${message}` }),
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
    const { layerId, imageName, photoData } = body as {
      layerId: number;
      imageName: string;
      photoData: unknown;
    };

    if (layerId == null || !imageName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: layerId, imageName' }),
        { status: 400, headers: JSON_HEADERS },
      );
    }

    // Upsert user record so the foreign key (if any) is satisfied
    await env.PHOTOS_DB.prepare(
      'INSERT INTO users (id, email, created_at) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING',
    )
      .bind(identity.email, identity.email, Date.now())
      .run();

    const id = crypto.randomUUID();
    const createdAt = Date.now();
    const photoDataJson = photoData != null ? JSON.stringify(photoData) : null;

    await env.PHOTOS_DB.prepare(
      'INSERT INTO favorites (id, user_id, layer_id, image_name, photo_data, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    )
      .bind(id, identity.email, layerId, imageName, photoDataJson, createdAt)
      .run();

    const newFavorite = {
      id,
      user_id: identity.email,
      layer_id: layerId,
      image_name: imageName,
      photo_data: photoDataJson,
      created_at: createdAt,
    };

    return new Response(JSON.stringify({ success: true, data: newFavorite }), {
      status: 201,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: `Failed to add favorite: ${message}` }),
      { status: 500, headers: JSON_HEADERS },
    );
  }
};

import type { APIRoute } from 'astro';
import { getAccessIdentity } from '@/lib/auth';

export const GET: APIRoute = async ({ request }) => {
  const identity = getAccessIdentity(request);

  if (!identity?.email) {
    return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      data: {
        email: identity.email,
        sub: identity.sub,
      },
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};

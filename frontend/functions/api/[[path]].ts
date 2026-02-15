/**
 * Cloudflare Pages Function - API Proxy
 *
 * Proxies all /api/* requests to the Worker backend.
 * This eliminates cross-origin issues (CORS, Cloudflare Access 302 redirects)
 * by making API calls same-origin from the browser's perspective.
 */

const WORKER_BASE_URL = "https://tas-aerial-browser.awhobbs.workers.dev";

interface PagesContext {
  request: Request;
  env: Record<string, unknown>;
  params: Record<string, string | string[]>;
  waitUntil: (promise: Promise<unknown>) => void;
  next: () => Promise<Response>;
}

export async function onRequest(context: PagesContext): Promise<Response> {
  const { request } = context;
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": url.origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "600",
      },
    });
  }

  // Build the proxied URL: replace origin with Worker origin, keep path + query
  const targetUrl = `${WORKER_BASE_URL}${url.pathname}${url.search}`;

  // Clone request headers, removing host (will be set by fetch)
  const headers = new Headers(request.headers);
  headers.delete("host");

  // Forward the request to the Worker
  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    body:
      request.method !== "GET" && request.method !== "HEAD"
        ? request.body
        : undefined,
    redirect: "follow",
  });

  try {
    const response = await fetch(proxyRequest);

    // Clone response headers
    const responseHeaders = new Headers(response.headers);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: "API proxy error: unable to reach backend",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

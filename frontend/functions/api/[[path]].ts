/**
 * Cloudflare Pages Function - API Proxy
 *
 * Proxies all /api/* requests to the Worker backend, forwarding the
 * CF_Authorization cookie from the Pages domain. This solves the fundamental
 * problem: the browser has an Access cookie for the Pages domain but not for
 * the Worker domain, so cross-origin requests always get 302'd to login.
 *
 * By proxying server-side, the browser makes a same-origin request (cookie
 * is sent automatically), and this function forwards it to the Worker.
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
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "600",
      },
    });
  }

  // Build the proxied URL: keep path + query, swap origin
  const targetUrl = `${WORKER_BASE_URL}${url.pathname}${url.search}`;

  // Forward headers, including the CF_Authorization cookie from the Pages domain
  const headers = new Headers(request.headers);
  headers.delete("host");

  const proxyRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    body:
      request.method !== "GET" && request.method !== "HEAD"
        ? request.body
        : undefined,
    redirect: "manual",
  });

  try {
    const response = await fetch(proxyRequest);

    // If Access still redirects (e.g. cookie expired), return a clean JSON 401
    if (
      response.status === 301 ||
      response.status === 302 ||
      response.status === 303
    ) {
      const location = response.headers.get("location") || "";
      if (
        location.includes("/cdn-cgi/access/") ||
        location.includes("cloudflareaccess.com")
      ) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Authentication required",
            code: "ACCESS_REDIRECT",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        error: "API proxy error: unable to reach backend",
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }
}

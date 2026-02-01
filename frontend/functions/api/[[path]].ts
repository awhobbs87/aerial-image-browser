/**
 * Cloudflare Pages Function that proxies API requests to the Worker.
 * This allows the frontend to use relative /api/* paths and preserves
 * the Cloudflare Access authentication cookie.
 */

interface Env {
  // No bindings needed - we just proxy to the Worker
}

const WORKER_URL = "https://tas-aerial-browser.awhobbs.workers.dev";

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, params } = context;

  // Build the path from the catch-all param
  const pathSegments = params.path as string[];
  const apiPath = pathSegments ? pathSegments.join("/") : "";

  // Construct the Worker URL
  const url = new URL(request.url);
  const workerUrl = `${WORKER_URL}/api/${apiPath}${url.search}`;

  // Clone the request with the new URL
  const headers = new Headers(request.headers);

  // Forward the CF_Authorization cookie for Cloudflare Access auth
  const cookie = request.headers.get("Cookie");
  if (cookie) {
    headers.set("Cookie", cookie);
  }

  // Create the proxied request
  const proxyRequest = new Request(workerUrl, {
    method: request.method,
    headers,
    body:
      request.method !== "GET" && request.method !== "HEAD"
        ? request.body
        : undefined,
    redirect: "follow",
  });

  try {
    // Forward to the Worker
    const response = await fetch(proxyRequest);

    // Clone the response and add CORS headers for good measure
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", url.origin);
    responseHeaders.set("Access-Control-Allow-Credentials", "true");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to proxy request to API",
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

const PREFIX = 'tas-aerial-';
const VERSION = 'v3';
const SHELL = `${PREFIX}shell-${VERSION}`;
const ASSETS = `${PREFIX}assets-${VERSION}`;
const IMAGES = `${PREFIX}images-${VERSION}`;
const TILES = `${PREFIX}tiles-${VERSION}`;
const OWNED = new Set([SHELL, ASSETS, IMAGES, TILES]);
const STATIC_ASSETS = ['/offline.html', '/manifest.json', '/icon.svg'];
const TILE_HOSTS = new Set([
  'basemaps.cartocdn.com',
  'tiles.stadiamaps.com',
  'server.arcgisonline.com',
]);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              (key.startsWith(PREFIX) || key === 'map-tiles' || key === 'thumbnails') &&
              !OWNED.has(key),
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  // Byte ranges must reach the TIFF proxy intact. Never cache authentication or user API data.
  if (
    request.method !== 'GET' ||
    request.headers.has('Range') ||
    url.pathname.startsWith('/cdn-cgi/')
  )
    return;
  if (sameOrigin && url.pathname.startsWith('/api/images/thumbnail/')) {
    event.respondWith(cacheFirst(event, IMAGES, 180, 86400));
  } else if (
    sameOrigin &&
    (url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/assets/'))
  ) {
    event.respondWith(cacheFirst(event, ASSETS, 200, 31536000));
  } else if (!sameOrigin && TILE_HOSTS.has(url.hostname)) {
    // Cache only tiles actually requested by the map, with the provider's explicit
    // cache lifetime. No bulk/offline prefetch or opaque-response caching.
    event.respondWith(cacheFirst(event, TILES, 256, 86400, true));
  } else if (sameOrigin && request.mode === 'navigate') {
    event.respondWith(navigation(event));
  }
});

async function freshMatch(cacheName, request) {
  const cache = await caches.open(cacheName);
  const response = await cache.match(request);
  if (!response) return null;
  const expiry = Number(response.headers.get('X-SW-Expires'));
  if (expiry && expiry < Date.now()) {
    await cache.delete(request);
    return null;
  }
  return response;
}

async function store(cacheName, request, response, limit, maxAge, requireLifetime = false) {
  if (response.status !== 200 || response.redirected || response.type === 'opaque') return;
  const control = response.headers.get('Cache-Control') || '';
  if (/no-store|private|no-cache/i.test(control)) return;
  const lifetime = control.match(/(?:^|,)\s*max-age=(\d+)/i);
  if (requireLifetime && !lifetime) return;
  const ttl = Math.min(maxAge, lifetime ? Number(lifetime[1]) : maxAge);
  if (!ttl) return;
  const headers = new Headers(response.headers);
  headers.set('X-SW-Expires', String(Date.now() + ttl * 1000));
  const cache = await caches.open(cacheName);
  await cache.put(request, new Response(response.body, { status: response.status, headers }));
  const keys = await cache.keys();
  await Promise.all(
    keys.slice(0, Math.max(0, keys.length - limit)).map((key) => cache.delete(key)),
  );
}

async function cacheFirst(event, cacheName, limit, maxAge, requireLifetime = false) {
  try {
    const cached = await freshMatch(cacheName, event.request);
    if (cached) return cached;
  } catch {
    /* Storage can be unavailable or full. Network access still works. */
  }
  try {
    const response = await fetch(event.request);
    event.waitUntil(
      store(cacheName, event.request, response.clone(), limit, maxAge, requireLifetime).catch(
        () => {},
      ),
    );
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function navigation(event) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(event.request, { signal: controller.signal });
    // Return Access redirects/errors as-is; cached pages must not override authentication.
    if (response.ok && response.headers.get('Content-Type')?.includes('text/html')) {
      event.waitUntil(store(SHELL, event.request, response.clone(), 24, 3600).catch(() => {}));
    }
    return response;
  } catch {
    return (
      (await freshMatch(SHELL, event.request).catch(() => null)) ||
      (await caches.match('/offline.html')) ||
      new Response('Offline', { status: 503 })
    );
  } finally {
    clearTimeout(timeout);
  }
}

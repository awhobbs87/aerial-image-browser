const CACHE_NAME = 'tas-aerial-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon.svg',
];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Never intercept Cloudflare system/auth routes.
  if (url.pathname.startsWith('/cdn-cgi/')) return;

  // API requests: network-first with timeout
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Map tiles: cache-first (they rarely change)
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(cacheFirst(event.request, 'map-tiles'));
    return;
  }

  // Thumbnail images: cache-first
  if (url.pathname.includes('/api/images/thumbnail/')) {
    event.respondWith(cacheFirst(event.request, 'thumbnails'));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const isSameOrigin = new URL(request.url).origin === self.location.origin;
    if (response.ok && !response.redirected && isSameOrigin) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) return offlinePage;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    const isSameOrigin = new URL(request.url).origin === self.location.origin;
    if (response.ok && !response.redirected && isSameOrigin) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

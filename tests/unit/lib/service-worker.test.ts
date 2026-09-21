// @vitest-environment node
import vm from 'node:vm';
import fs from 'node:fs';
const script = fs.readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8');
function worker(fetcher = vi.fn<typeof fetch>()) {
  const handlers = new Map<string, Function>();
  const stores = new Map<string, Map<string, Response>>();
  const cacheFor = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const map = stores.get(name)!;
    const key = (r: Request | string) =>
      typeof r === 'string' ? new URL(r, 'https://app.test').href : r.url;
    return {
      match: async (r: Request | string) => map.get(key(r))?.clone(),
      put: async (r: Request | string, response: Response) => {
        map.set(key(r), response.clone());
      },
      delete: async (r: Request | string) => map.delete(key(r)),
      keys: async () => [...map.keys()],
      addAll: async () => {},
    };
  };
  const caches = {
    open: async (name: string) => cacheFor(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (r: string) => {
      for (const name of stores.keys()) {
        const hit = await cacheFor(name).match(r);
        if (hit) return hit;
      }
    },
  };
  vm.runInNewContext(script, {
    caches,
    fetch: fetcher,
    Request,
    Response,
    Headers,
    URL,
    AbortController,
    Date,
    setTimeout,
    clearTimeout,
    self: {
      location: { origin: 'https://app.test' },
      addEventListener: (name: string, handler: Function) => handlers.set(name, handler),
      skipWaiting() {},
      clients: { claim: async () => {} },
    },
  });
  return {
    stores,
    caches,
    handlers,
    request: async (path: string, extra: object = {}) => {
      let response: Promise<Response> | undefined;
      const tasks: Promise<unknown>[] = [];
      const request = {
        url: new URL(path, 'https://app.test').href,
        method: 'GET',
        headers: new Headers(),
        mode: 'cors',
        ...extra,
      };
      handlers.get('fetch')!({
        request,
        respondWith: (value: Promise<Response>) => {
          response = value;
        },
        waitUntil: (task: Promise<unknown>) => tasks.push(task),
      });
      const result = await response;
      await Promise.all(tasks);
      return result;
    },
  };
}
it('serves thumbnails from cache before the general API path', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () => new Response('photo', { headers: { 'Cache-Control': 'public, max-age=60' } }),
    );
  const sw = worker(fetcher);
  await sw.request('/api/images/thumbnail/0/photo?variant=card-320');
  expect(await (await sw.request('/api/images/thumbnail/0/photo?variant=card-320'))!.text()).toBe(
    'photo',
  );
  expect(fetcher).toHaveBeenCalledOnce();
});
it('does not intercept TIFF ranges, Access or personalized APIs', async () => {
  const fetcher = vi.fn<typeof fetch>();
  const sw = worker(fetcher);
  for (const path of [
    '/api/me',
    '/api/favorites',
    '/cdn-cgi/access/login',
    '/api/images/tiff-proxy/0/photo',
  ]) {
    expect(
      await sw.request(path, { headers: new Headers({ Range: 'bytes=0-100' }) }),
    ).toBeUndefined();
  }
  expect(await sw.request('/api/me')).toBeUndefined();
  expect(fetcher).not.toHaveBeenCalled();
});
it('respects explicit tile cache policy and distinguishes image variants', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () => new Response('tile', { headers: { 'Cache-Control': 'no-store' } }),
    );
  const sw = worker(fetcher);
  await sw.request(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/1/2/3',
  );
  expect([...sw.stores.values()].every((store) => store.size === 0)).toBe(true);
  fetcher.mockImplementation(
    async () => new Response('image', { headers: { 'Cache-Control': 'public,max-age=3600' } }),
  );
  await sw.request('/api/images/thumbnail/0/photo?variant=card-320');
  await sw.request('/api/images/thumbnail/0/photo?variant=preview-1600');
  expect(sw.stores.get('tas-aerial-images-v3')?.size).toBe(2);
});
it('expires cached images and bounds the thumbnail cache', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      async () => new Response('image', { headers: { 'Cache-Control': 'max-age=60' } }),
    );
  const sw = worker(fetcher);
  for (let i = 0; i < 182; i++) await sw.request(`/api/images/thumbnail/0/photo-${i}`);
  expect(sw.stores.get('tas-aerial-images-v3')?.size).toBe(180);
  const cache = await sw.caches.open('tas-aerial-images-v3');
  await cache.put(
    '/api/images/thumbnail/0/expired',
    new Response('old', { headers: { 'X-SW-Expires': '1' } }),
  );
  expect(await (await sw.request('/api/images/thumbnail/0/expired'))!.text()).toBe('image');
});
it('uses the offline page when navigation times out', async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockImplementation(
      (_request, { signal }) =>
        new Promise((_resolve, reject) =>
          signal.addEventListener('abort', () => reject(new Error('aborted'))),
        ),
    );
  const sw = worker(fetcher);
  await (
    await sw.caches.open('tas-aerial-shell-v3')
  ).put('/offline.html', new Response('offline page'));
  const pending = sw.request('/search', { mode: 'navigate' });
  await vi.advanceTimersByTimeAsync(3001);
  expect(await (await pending)!.text()).toBe('offline page');
  vi.useRealTimers();
});
it('cleans only owned caches on activation', async () => {
  const sw = worker();
  for (const name of ['tas-aerial-v2', 'tas-aerial-images-v3', 'unrelated-app'])
    await sw.caches.open(name);
  const tasks: Promise<unknown>[] = [];
  sw.handlers.get('activate')!({ waitUntil: (task: Promise<unknown>) => tasks.push(task) });
  await Promise.all(tasks);
  expect([...sw.stores.keys()]).toEqual(['tas-aerial-images-v3', 'unrelated-app']);
});

import { waitFor } from '@testing-library/react';
import { servePhotoImage } from '@/lib/photo-media';
const image = () => new Response('jpeg', { headers: { 'Content-Type': 'image/jpeg' } });
function bindings() {
  return {
    API_BASE_URL: 'https://list.example/MapServer',
    PHOTO_CACHE: {
      get: vi.fn<(...args: any[]) => any>().mockResolvedValue('https://images.example/photo.jpg'),
      put: vi.fn<(...args: any[]) => any>().mockResolvedValue(undefined),
    },
    THUMBNAIL_STORAGE: {
      get: vi.fn<(...args: any[]) => any>().mockResolvedValue(null),
      put: vi.fn<(...args: any[]) => any>().mockResolvedValue(undefined),
    },
  };
}
afterEach(() => vi.unstubAllGlobals());
it('serves R2 variants without another source request or transformation', async () => {
  const env = bindings();
  env.THUMBNAIL_STORAGE.get.mockResolvedValue({
    body: new Response('webp').body,
    httpMetadata: { contentType: 'image/webp' },
  });
  const fetcher = vi.fn<(...args: any[]) => any>();
  vi.stubGlobal('fetch', fetcher);
  const response = await servePhotoImage(
    new Request('https://app.example/photo?variant=card-320'),
    0,
    '1439_183',
    env as any,
    () => {},
  );
  expect(response.headers.get('Content-Type')).toBe('image/webp');
  expect(await response.text()).toBe('webp');
  expect(fetcher).not.toHaveBeenCalled();
});
it('stores a transformed variant in the background without waiting for R2 writes', async () => {
  const env = bindings();
  env.THUMBNAIL_STORAGE.put.mockImplementation(() => new Promise(() => {}));
  const output = vi
    .fn<(...args: any[]) => any>()
    .mockResolvedValue({ response: () => new Response('webp') });
  const transform = vi.fn<() => { output: typeof output }>(() => ({ output }));
  const images = { input: vi.fn<() => { transform: typeof transform }>(() => ({ transform })) };
  vi.stubGlobal('fetch', vi.fn<(...args: any[]) => any>().mockResolvedValue(image()));
  const defer = vi.fn<(...args: any[]) => any>();
  const response = await servePhotoImage(
    new Request('https://app.example/photo?variant=card-640'),
    0,
    '1439_183',
    { ...env, IMAGES: images } as any,
    defer,
  );
  expect(transform).toHaveBeenCalledWith({ width: 640, height: 640, fit: 'scale-down' });
  expect(output).toHaveBeenCalledWith({ format: 'image/webp', quality: 80 });
  expect(await response.text()).toBe('webp');
  expect(defer).toHaveBeenCalled();
  await waitFor(() =>
    expect(
      env.THUMBNAIL_STORAGE.put.mock.calls.some(([key]) => key.includes('card-640.webp')),
    ).toBe(true),
  );
});
it('never stores an unresized fallback under a long-lived variant key', async () => {
  const env = bindings();
  vi.stubGlobal('fetch', vi.fn<(...args: any[]) => any>().mockResolvedValue(image()));
  const response = await servePhotoImage(
    new Request('https://app.example/photo?variant=card-320'),
    0,
    '1439_183',
    env as any,
    () => {},
  );
  expect(response.headers.get('Cache-Control')).toContain('max-age=60');
  expect(env.THUMBNAIL_STORAGE.put.mock.calls.every(([key]) => !key.startsWith('variants/'))).toBe(
    true,
  );
});
it('rejects arbitrary transformations before accessing upstream services', async () => {
  const env = bindings();
  const response = await servePhotoImage(
    new Request('https://app.example/photo?variant=huge'),
    0,
    'photo',
    env as any,
    () => {},
  );
  expect(response.status).toBe(400);
  expect(env.THUMBNAIL_STORAGE.get).not.toHaveBeenCalled();
});

import { CacheManager } from '@/lib/cache';

function createMockKV() {
  return {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

describe('CacheManager', () => {
  let mockKV: ReturnType<typeof createMockKV>;
  let cache: CacheManager;

  beforeEach(() => {
    mockKV = createMockKV();
    cache = new CacheManager(mockKV);
  });

  describe('get', () => {
    it('returns parsed JSON when key exists', async () => {
      const data = { layers: [0, 1, 2], count: 42 };
      (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValue(data);

      const result = await cache.get<typeof data>('test-key');

      expect(mockKV.get).toHaveBeenCalledWith('test-key', 'json');
      expect(result).toEqual(data);
    });

    it('returns null when key does not exist', async () => {
      (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await cache.get('nonexistent');

      expect(mockKV.get).toHaveBeenCalledWith('nonexistent', 'json');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('calls put with JSON string and default TTL', async () => {
      const data = { name: 'test' };

      await cache.set('my-key', data);

      expect(mockKV.put).toHaveBeenCalledWith(
        'my-key',
        JSON.stringify(data),
        { expirationTtl: 86400 },
      );
    });

    it('calls put with custom TTL', async () => {
      const data = { name: 'test' };

      await cache.set('my-key', data, 3600);

      expect(mockKV.put).toHaveBeenCalledWith(
        'my-key',
        JSON.stringify(data),
        { expirationTtl: 3600 },
      );
    });
  });

  describe('delete', () => {
    it('calls KV delete with the key', async () => {
      await cache.delete('remove-me');

      expect(mockKV.delete).toHaveBeenCalledWith('remove-me');
    });
  });

  describe('has', () => {
    it('returns true when key exists', async () => {
      (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValue('some-value');

      const result = await cache.has('existing-key');

      expect(mockKV.get).toHaveBeenCalledWith('existing-key');
      expect(result).toBe(true);
    });

    it('returns false when key does not exist', async () => {
      (mockKV.get as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await cache.has('missing-key');

      expect(mockKV.get).toHaveBeenCalledWith('missing-key');
      expect(result).toBe(false);
    });
  });
});

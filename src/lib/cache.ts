export class CacheManager {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const cached = await this.kv.get(key, "json");
    return cached as T | null;
  }

  async set<T>(key: string, value: T, ttl = 86400): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), { expirationTtl: ttl });
  }
}

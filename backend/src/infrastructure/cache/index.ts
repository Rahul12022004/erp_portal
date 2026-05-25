// Cache provider stub — wire a Redis/memory adapter here
export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class NoOpCache implements CacheProvider {
  async get<T>(_key: string): Promise<T | null> { return null; }
  async set<T>(_key: string, _value: T, _ttl?: number): Promise<void> {}
  async del(_key: string): Promise<void> {}
}

export const cache: CacheProvider = new NoOpCache();

// Redis disabled — no connection without Redis server
export function createRedisConnection(): never {
  throw new Error("Redis not available in this environment");
}

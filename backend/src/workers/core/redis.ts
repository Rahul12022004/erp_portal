import { Redis } from "ioredis";

export function createRedisConnection(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const conn = new Redis(url, {
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    lazyConnect: false,
  });
  conn.on("error", (err: Error) => {
    console.error("[Redis] connection error:", err.message);
  });
  return conn;
}

import { createClient, type RedisClientType } from "redis";

export const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", (err) => console.error("redis client error:", err));

(async () => {
  if (!redis.isOpen) await redis.connect();
  console.log("redis connected...");
})();

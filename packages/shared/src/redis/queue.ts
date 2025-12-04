import { createClient, type RedisClientType } from "redis";

export const redisQueue: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

redisQueue.on("error", (err) => console.error("redis queue error:", err));

(async () => {
  if (!redisQueue.isOpen) await redisQueue.connect();
})();

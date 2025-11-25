import { createClient, RedisClientType } from "redis";

export const redisSub: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

redisSub.on("error", (err) => console.error("redis subscriber error:", err));

(async () => {
  if (!redisSub.isOpen) await redisSub.connect();
})();

import { createClient, type RedisClientType } from "redis";

export const redisPub: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

redisPub.on("error", (err) => console.error("redis publisher error::", err));

(async () => {
  if (!redisPub.isOpen) await redisPub.connect();
})();

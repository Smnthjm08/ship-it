import { type RedisClientOptions } from "redis";

/**
 * Validates and returns the Redis configuration.
 * Throws an error if required configuration is missing in production.
 */
export const getRedisConfig = (): RedisClientOptions => {
  const url = process.env.REDIS_URL;

  if (!url && process.env.NODE_ENV === "production") {
    throw new Error("REDIS_URL is required in production environment");
  }

  return {
    url: url,
    // Add common options here (e.g., reconnection strategy)
    socket: {
      reconnectStrategy: (retries: number) => {
        if (retries > 10) {
          console.error("Redis reconnection failed after 10 attempts");
          return new Error("Redis reconnection failed");
        }
        return Math.min(retries * 100, 3000);
      },
    },
  };
};

export const redisConfig: RedisClientOptions = getRedisConfig();

import { createClient } from "redis";
import { redisConfig } from "./config.js";

const client = createClient(redisConfig);

export type RedisClient = any;
export const redis: any = client;

redis.on("error", (err: any) => console.error("redis client error:", err));


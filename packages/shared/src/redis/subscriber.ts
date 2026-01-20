import { createClient } from "redis";
import { redisConfig } from "./config.js";

export const redisSub: any = createClient(redisConfig);

redisSub.on("error", (err: any) =>
  console.error("redis subscriber error:", err),
);

import { createClient } from "redis";
import { redisConfig } from "./config.js";

export const redisQueue: any = createClient(redisConfig);

redisQueue.on("error", (err: any) => console.error("redis queue error:", err));


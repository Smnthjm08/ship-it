import { createClient } from "redis";
import { redisConfig } from "./config.js";

export const redisPub: any = createClient(redisConfig);

redisPub.on("error", (err: any) => console.error("redis publisher error::", err));


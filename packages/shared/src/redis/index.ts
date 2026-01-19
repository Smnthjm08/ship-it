import { redis } from "./client.js";
import { redisPub } from "./publisher.js";
import { redisSub } from "./subscriber.js";
import { redisQueue } from "./queue.js";

const clients = [redis, redisPub, redisSub, redisQueue];

/**
 * Connects all Redis clients.
 * This should be called during application startup.
 */
export async function connectRedis() {
    await Promise.all(
        clients.map(async (client) => {
            if (!client.isOpen) {
                await client.connect();
            }
        })
    );
}

/**
 * Disconnects all Redis clients gracefully.
 * This should be called during application shutdown.
 */
export async function disconnectRedis() {
    await Promise.all(
        clients.map(async (client) => {
            if (client.isOpen) {
                await client.quit();
            }
        })
    );
}

export * from "./client.js";
export * from "./publisher.js";
export * from "./subscriber.js";
export * from "./queue.js";
export * from "./config.js";

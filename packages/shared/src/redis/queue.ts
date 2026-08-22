import { createClient } from "redis";
import { redisConfig } from "./config.js";
import type { RedisClient } from "./client.js";

export const redisQueue: RedisClient = createClient(redisConfig);

redisQueue.on("error", (err: Error) =>
  console.error("redis queue error:", err),
);

redisQueue.connect().catch((err: unknown) => {
  console.error("Failed to connect to Redis queue:", err);
});

/** Unreachable queue — distinct from a bug so callers can answer 503, not 500. */
export class QueueUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Build queue is unavailable — Redis is not connected.");
    this.name = "QueueUnavailableError";
    this.cause = cause;
  }
}

// node-redis buffers commands while reconnecting, so without this an enqueue
// against a dead Redis hangs until the socket times out instead of failing fast.
export function isQueueReady(): boolean {
  return redisQueue.isReady;
}

/** Pending build jobs, newest pushed on the left, consumed from the right. */
export const BUILD_QUEUE = "deploymentId";
/** Jobs a worker has reserved but not finished yet. */
export const BUILD_PROCESSING_QUEUE = "deploymentId:processing";

// Callers have already written a QUEUED row by now, so they need to tell
// "retry later" from "this deployment is a lie" — hence the typed error.
export async function enqueueBuild(deploymentId: string): Promise<void> {
  if (!redisQueue.isReady) throw new QueueUnavailableError();
  try {
    await redisQueue.lPush(BUILD_QUEUE, deploymentId);
  } catch (err) {
    throw new QueueUnavailableError(err);
  }
}

// Atomically parks the job on the processing list rather than dropping it, so a
// worker that dies mid-build leaves it for `recoverStaleBuilds()`. `null` on timeout.
export async function reserveBuild(timeoutSeconds = 0): Promise<string | null> {
  return redisQueue.blMove(
    BUILD_QUEUE,
    BUILD_PROCESSING_QUEUE,
    "RIGHT",
    "LEFT",
    timeoutSeconds,
  );
}

/** Mark a reserved job as finished (success or terminal failure). */
export async function ackBuild(deploymentId: string): Promise<void> {
  await redisQueue.lRem(BUILD_PROCESSING_QUEUE, 0, deploymentId);
}

// Call at worker startup only: with more than one worker this also reclaims jobs
// legitimately in flight elsewhere. Single worker, or use per-worker lists.
export async function recoverStaleBuilds(): Promise<string[]> {
  const recovered: string[] = [];
  for (;;) {
    const deploymentId = await redisQueue.lMove(
      BUILD_PROCESSING_QUEUE,
      BUILD_QUEUE,
      "RIGHT",
      "RIGHT",
    );
    if (!deploymentId) break;
    recovered.push(deploymentId);
  }
  return recovered;
}

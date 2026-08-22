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

/**
 * The queue is unreachable. Distinct from a programming error so callers can
 * answer 503 ("come back later") instead of 500 ("we're broken") — and so a
 * deployment row is never left QUEUED for a job that was never enqueued.
 */
export class QueueUnavailableError extends Error {
  constructor(cause?: unknown) {
    super("Build queue is unavailable — Redis is not connected.");
    this.name = "QueueUnavailableError";
    this.cause = cause;
  }
}

/**
 * Whether the queue client is connected *right now*. node-redis buffers
 * commands while it reconnects, so without this check an enqueue against a dead
 * Redis hangs until the socket times out rather than failing fast.
 */
export function isQueueReady(): boolean {
  return redisQueue.isReady;
}

/** Pending build jobs, newest pushed on the left, consumed from the right. */
export const BUILD_QUEUE = "deploymentId";
/** Jobs a worker has reserved but not finished yet. */
export const BUILD_PROCESSING_QUEUE = "deploymentId:processing";

/**
 * Queue a deployment for the Shipyard worker.
 *
 * Throws `QueueUnavailableError` rather than letting a raw connection error
 * escape: every caller has already written a `QUEUED` row by this point and
 * needs to distinguish "retry later" from "this deployment is now a lie".
 */
export async function enqueueBuild(deploymentId: string): Promise<void> {
  if (!redisQueue.isReady) throw new QueueUnavailableError();
  try {
    await redisQueue.lPush(BUILD_QUEUE, deploymentId);
  } catch (err) {
    throw new QueueUnavailableError(err);
  }
}

/**
 * Blocking-pop a job, but atomically park it on the processing list instead of
 * dropping it on the floor. If the worker dies mid-build the job is still there
 * and `recoverStaleBuilds()` puts it back on the queue at next startup.
 * Returns `null` when the timeout (in seconds, 0 = forever) elapses.
 */
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

/**
 * Move every job left behind by a crashed worker back onto the queue.
 * Call this at worker startup — with more than one worker it would also reclaim
 * jobs that are legitimately in flight elsewhere, so keep it to a single worker
 * or replace it with a per-worker processing list.
 */
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

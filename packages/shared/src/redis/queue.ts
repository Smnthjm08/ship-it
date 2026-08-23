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
/** Jobs that crashed a worker too many times to keep retrying. */
export const BUILD_DEAD_LETTER_QUEUE = "deploymentId:dead";
/** deploymentId -> how many times a worker died holding it. */
const BUILD_ATTEMPTS_KEY = "deploymentId:attempts";

// Crashes only — a build that fails normally is acked and never counted. This is
// for the job that kills the process, which startup recovery would replay forever.
export const MAX_BUILD_ATTEMPTS = 3;

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
  // Terminal state clears the crash count.
  await redisQueue.hDel(BUILD_ATTEMPTS_KEY, deploymentId).catch(() => {});
}

/** Jobs set aside after repeated crashes, for inspection or manual replay. */
export async function listDeadLetters(): Promise<string[]> {
  return redisQueue.lRange(BUILD_DEAD_LETTER_QUEUE, 0, -1);
}

/** Put a dead-lettered job back on the queue with a clean attempt count. */
export async function replayDeadLetter(deploymentId: string): Promise<void> {
  await redisQueue.lRem(BUILD_DEAD_LETTER_QUEUE, 0, deploymentId);
  await redisQueue.hDel(BUILD_ATTEMPTS_KEY, deploymentId).catch(() => {});
  await redisQueue.lPush(BUILD_QUEUE, deploymentId);
}

// Startup only: with more than one worker this also reclaims jobs legitimately in
// flight elsewhere. A job on the processing list at boot means the worker died
// holding it — requeue, but count crashes so a poison job can't replay forever.
export async function recoverStaleBuilds(): Promise<{
  requeued: string[];
  deadLettered: string[];
}> {
  const requeued: string[] = [];
  const deadLettered: string[] = [];

  for (;;) {
    const deploymentId = await redisQueue.rPop(BUILD_PROCESSING_QUEUE);
    if (!deploymentId) break;

    const attempts = await redisQueue.hIncrBy(
      BUILD_ATTEMPTS_KEY,
      deploymentId,
      1,
    );

    if (attempts >= MAX_BUILD_ATTEMPTS) {
      await redisQueue.lPush(BUILD_DEAD_LETTER_QUEUE, deploymentId);
      deadLettered.push(deploymentId);
    } else {
      await redisQueue.rPush(BUILD_QUEUE, deploymentId);
      requeued.push(deploymentId);
    }
  }

  return { requeued, deadLettered };
}

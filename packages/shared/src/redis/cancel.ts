import { redisPub } from "./publisher.js";
import { redisSub } from "./subscriber.js";

// Only a build already inside a container needs this channel — one still queued
// is cancelled by its row alone, which the worker checks when it reserves the job.
const CANCEL_CHANNEL = "deployment:cancel";

/** Best-effort: a worker that isn't listening simply never acts on it. */
export async function requestCancel(deploymentId: string): Promise<void> {
  if (!redisPub.isOpen) return;
  await redisPub.publish(CANCEL_CHANNEL, deploymentId);
}

/**
 * Returns an unsubscribe function. Shipyard subscribes once at startup and
 * ignores ids other than the build it currently holds.
 */
export async function subscribeCancellations(
  listener: (deploymentId: string) => void,
): Promise<() => Promise<void>> {
  await redisSub.subscribe(CANCEL_CHANNEL, (message) => listener(message));
  return async () => {
    await redisSub.unsubscribe(CANCEL_CHANNEL);
  };
}

export const CANCELLABLE_STATUSES = ["QUEUED", "CLONING", "BUILDING"] as const;

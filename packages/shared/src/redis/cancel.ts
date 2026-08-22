import { redisPub } from "./publisher.js";
import { redisSub } from "./subscriber.js";

// Cancellation is a signal, not a queue: the API asks, the worker decides.
//
// A build that hasn't started yet is cancelled purely in the database — the
// worker checks the row's status when it reserves the job and drops it. Only a
// build already inside a container needs this channel, because at that point the
// API has no handle on the Docker container and the worker isn't polling the DB.
const CANCEL_CHANNEL = "deployment:cancel";

/**
 * Ask whichever worker owns this deployment to stop. Best-effort by design:
 * a worker that isn't listening (or a build that already finished) simply never
 * acts on it, and the deployment's real state stays whatever the DB says.
 */
export async function requestCancel(deploymentId: string): Promise<void> {
  if (!redisPub.isOpen) return;
  await redisPub.publish(CANCEL_CHANNEL, deploymentId);
}

/**
 * Listen for cancellation requests. Returns an unsubscribe function.
 * Shipyard subscribes once at startup and keeps the id of the build it is
 * currently running, so it can ignore requests meant for another worker.
 */
export async function subscribeCancellations(
  listener: (deploymentId: string) => void,
): Promise<() => Promise<void>> {
  await redisSub.subscribe(CANCEL_CHANNEL, (message) => listener(message));
  return async () => {
    await redisSub.unsubscribe(CANCEL_CHANNEL);
  };
}

/** Statuses a deployment can still be cancelled from. */
export const CANCELLABLE_STATUSES = ["QUEUED", "CLONING", "BUILDING"] as const;

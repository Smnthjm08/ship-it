import http from "http";
import { isQueueReady } from "@repo/shared";
import { logger } from "@repo/shared/logger";
import { docker } from "./build/container.js";

/** `PORT` is already claimed by the backend, so the worker gets its own. */
export const HEALTH_PORT = Number(process.env.SHIPYARD_HEALTH_PORT) || 3004;

export const HEALTH_PATH = "/health";

/**
 * A wedged daemon answers the socket but never the ping, and a health check
 * that hangs is worse than one that fails — the orchestrator learns nothing.
 */
const DOCKER_PING_TIMEOUT_MS = 2_000;

async function dockerUp(): Promise<boolean> {
  try {
    await Promise.race([
      docker.ping(),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("docker ping timed out")),
          DOCKER_PING_TIMEOUT_MS,
        ),
      ),
    ]);
    return true;
  } catch {
    return false;
  }
}

/** What the worker is doing right now, read at request time. */
export type WorkerState = () => { activeDeploymentId: string | null };

/**
 * Liveness alone would report a healthy worker that cannot build anything: this
 * worker is useless without both Redis (to receive jobs) and Docker (to run
 * them), so both are checked and a failure answers 503 like the backend's.
 */
export function startHealthServer(getState: WorkerState): http.Server {
  const server = http.createServer((req, res) => {
    const path = (req.url || "").split("?")[0];
    if (path !== HEALTH_PATH) {
      res.writeHead(404, { "content-type": "application/json" });
      return res.end(JSON.stringify({ status: "NOT_FOUND" }));
    }
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, {
        "content-type": "application/json",
        allow: "GET, HEAD",
      });
      return res.end(JSON.stringify({ status: "METHOD_NOT_ALLOWED" }));
    }

    void (async () => {
      const redis = isQueueReady();
      const dockerOk = await dockerUp();
      const healthy = redis && dockerOk;
      const { activeDeploymentId } = getState();

      const down = [!redis && "Redis", !dockerOk && "Docker"].filter(Boolean);

      res.writeHead(healthy ? 200 : 503, {
        "content-type": "application/json",
        "cache-control": "no-store",
      });
      if (req.method === "HEAD") return res.end();
      res.end(
        JSON.stringify({
          status: healthy ? "OK" : "DEGRADED",
          message: healthy
            ? "healthy!"
            : `${down.join(" and ")} unreachable — builds cannot run`,
          checks: {
            redis: redis ? "up" : "down",
            docker: dockerOk ? "up" : "down",
          },
          // The queue is single-worker, so "busy" explains a deployment that is
          // queued and apparently not moving.
          worker: {
            busy: activeDeploymentId !== null,
            deploymentId: activeDeploymentId,
          },
        }),
      );
    })();
  });

  // A port collision must not take the worker down — it builds fine without
  // anyone watching it.
  server.on("error", (err) =>
    logger.error({ err, port: HEALTH_PORT }, "Health server error"),
  );

  server.listen(HEALTH_PORT, () =>
    logger.info(
      { port: HEALTH_PORT },
      `Health endpoint on :${HEALTH_PORT}${HEALTH_PATH}`,
    ),
  );

  return server;
}

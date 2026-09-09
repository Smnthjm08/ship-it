import fs from "fs";
import {
  connectRedis,
  reserveBuild,
  ackBuild,
  recoverStaleBuilds,
  publishDeploymentLog,
  subscribeCancellations,
} from "@repo/shared";
import { logger, deploymentLogger, type Logger } from "@repo/shared/logger";
import { requireEnv, SHIPYARD_REQUIRED_ENV } from "@repo/shared/env/require";
import { prisma, DeploymentStatus } from "@repo/db";
import { cloneRepo } from "./git/clone-repo.js";
import { buildInContainer } from "./build/run-build.js";
import { decryptProjectEnv } from "./env/project-env.js";
import { updateDeploymentStatus } from "./queries/deployment-status.js";
import { startHealthServer } from "./health.js";

/** Did this deployment get cancelled while we were building it? */
async function wasCancelled(deploymentId: string | null): Promise<boolean> {
  if (!deploymentId) return false;
  const row = await prisma.deployment
    .findUnique({ where: { id: deploymentId }, select: { status: true } })
    .catch(() => null);
  return row?.status === "CANCELLED";
}

/** Update status in the DB and tell any live log watchers about it. */
async function setStatus(deploymentId: string, status: DeploymentStatus) {
  await updateDeploymentStatus(deploymentId, status);
  await publishDeploymentLog({
    deploymentId,
    message: `Deployment ${status.toLowerCase()}`,
    timestamp: new Date().toISOString(),
    status,
    done: status === "COMPLETED" || status === "FAILED",
  });
}

// The build currently in this worker's hands, and how to stop it. Both are set
// while a container is running and cleared the moment the build ends.
let activeDeploymentId: string | null = null;
let stopActiveContainer: (() => Promise<void>) | null = null;

async function startWorker() {
  // A build that reaches the upload step with no bucket configured has already
  // burned minutes of container time for nothing.
  requireEnv(SHIPYARD_REQUIRED_ENV, "shipyard");

  // Before connectRedis(), so a worker that can't reach Redis is still able to
  // report that rather than looking dead.
  startHealthServer(() => ({ activeDeploymentId }));

  await connectRedis();
  logger.info("Redis connected");

  // A build that was in flight when the worker last died is still parked on the
  // processing list — put it back on the queue instead of losing it.
  const { requeued, deadLettered } = await recoverStaleBuilds();
  if (requeued.length) {
    logger.warn({ requeued }, "Requeued orphaned deployments");
  }
  if (deadLettered.length) {
    // These crashed the worker MAX_BUILD_ATTEMPTS times. Mark them FAILED so the
    // UI stops showing a build that will never run, and leave them on the
    // dead-letter list for inspection or `replayDeadLetter()`.
    logger.error(
      { deadLettered },
      "Deployments set aside after repeated worker crashes",
    );
    for (const deploymentId of deadLettered) {
      await setStatus(deploymentId, DeploymentStatus.FAILED).catch((err) =>
        logger.error(
          { err, deploymentId },
          "Could not mark dead letter FAILED",
        ),
      );
      await prisma.deploymentLog
        .create({
          data: {
            deploymentId,
            message:
              "Build abandoned: it crashed the build worker repeatedly. Check the build command and try again.",
          },
        })
        .catch(() => {});
    }
  }

  // One subscription for the worker's lifetime; requests for a build this
  // worker isn't running are ignored rather than racing another instance.
  await subscribeCancellations(async (deploymentId) => {
    if (deploymentId !== activeDeploymentId || !stopActiveContainer) return;
    logger.warn(
      { deploymentId },
      "Cancellation requested — stopping container",
    );
    await stopActiveContainer().catch((err) =>
      logger.error({ err, deploymentId }, "Could not stop container"),
    );
  });

  logger.info("Worker started, waiting for deployments");

  while (true) {
    let deploymentIdElement: string | null = null;
    let repoDir: string | null = null;
    // Rebound once a job is reserved, so every line below carries its id.
    let log: Logger = logger;
    try {
      deploymentIdElement = await reserveBuild(0);
      if (!deploymentIdElement) continue;
      log = deploymentLogger(deploymentIdElement);
      log.info("Reserved deployment");

      const deployment = await prisma.deployment.findUnique({
        where: { id: deploymentIdElement },
        include: {
          project: {
            include: {
              envVars: true,
              user: {
                include: {
                  accounts: true,
                },
              },
            },
          },
        },
      });

      if (!deployment) {
        throw new Error(`Deployment ${deploymentIdElement} not found`);
      }

      // Cancelled while it sat in the queue: the row is already CANCELLED, so
      // there is nothing to build and nothing to mark failed.
      if (deployment.status === "CANCELLED") {
        log.info("Skipping deployment cancelled before it started");
        continue;
      }

      await setStatus(deployment.id, DeploymentStatus.CLONING);

      repoDir = await cloneRepo(deployment);
      log.info({ repoDir }, "Repo cloned");

      await setStatus(deployment.id, DeploymentStatus.BUILDING);

      // Decrypt here rather than inside the build so a bad key fails the
      // deployment with a clear message instead of a mid-build error.
      const envVars = decryptProjectEnv(deployment.project.envVars);

      activeDeploymentId = deployment.id;

      // new docker container should be created for each deployment
      await buildInContainer(
        deployment.id,
        repoDir,
        deployment.project.id,
        deployment.project.buildCommand || "",
        deployment.project.installCommand || "",
        deployment.project.rootDir || "",
        deployment.project.outputDir || "",
        deployment.project.framework,
        envVars,
        (stop) => {
          stopActiveContainer = stop;
        },
      );
      log.info("Build finished");

      await setStatus(deployment.id, DeploymentStatus.COMPLETED);

      // A newer successful build supersedes any rollback pin. Without this,
      // rolling back and then deploying a fix would appear to do nothing —
      // the proxy would keep serving the pinned build forever.
      if (deployment.project.activeDeploymentId) {
        await prisma.project
          .update({
            where: { id: deployment.project.id },
            data: { activeDeploymentId: null },
          })
          .then(() => log.info("Cleared rollback pin — newer build is live"))
          .catch((err) => log.error({ err }, "Could not clear rollback pin"));
      }
    } catch (error) {
      // A cancelled build throws when its container is stopped. That is the
      // expected path, not a failure — leave the CANCELLED status alone.
      const cancelled = await wasCancelled(deploymentIdElement);
      if (cancelled) {
        log.info("Deployment cancelled");
        await publishDeploymentLog({
          deploymentId: deploymentIdElement!,
          message: "Deployment cancelled",
          timestamp: new Date().toISOString(),
          status: "CANCELLED",
          done: true,
        });
        continue;
      }

      log.error({ err: error }, "Deployment failed");
      if (deploymentIdElement) {
        const message =
          error instanceof Error ? error.message : "Unknown build error";
        try {
          await prisma.deploymentLog.create({
            data: { deploymentId: deploymentIdElement, message },
          });
          await publishDeploymentLog({
            deploymentId: deploymentIdElement,
            message,
            timestamp: new Date().toISOString(),
          });
          await setStatus(deploymentIdElement, DeploymentStatus.FAILED);
        } catch (e) {
          log.error({ err: e }, "Could not mark deployment FAILED");
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } finally {
      activeDeploymentId = null;
      stopActiveContainer = null;
      // The job reached a terminal state (COMPLETED or FAILED) — drop it from the
      // processing list so startup recovery doesn't replay it.
      if (deploymentIdElement) {
        try {
          await ackBuild(deploymentIdElement);
        } catch (e) {
          log.error({ err: e }, "Could not ack deployment");
        }
      }
      // Always remove the cloned repo so the worker's disk doesn't fill up.
      if (repoDir && fs.existsSync(repoDir)) {
        try {
          fs.rmSync(repoDir, { recursive: true, force: true });
          log.debug({ repoDir }, "Cleaned up clone dir");
        } catch (e) {
          log.error({ err: e, repoDir }, "Could not clean up clone dir");
        }
      }
    }
  }
}

startWorker().catch((err) => {
  logger.error({ err }, "Worker failed to start");
  process.exit(1);
});

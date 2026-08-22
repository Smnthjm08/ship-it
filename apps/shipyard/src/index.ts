import fs from "fs";
import {
  connectRedis,
  reserveBuild,
  ackBuild,
  recoverStaleBuilds,
  publishDeploymentLog,
} from "@repo/shared";
import { logger, deploymentLogger, type Logger } from "@repo/shared/logger";
import { requireEnv, SHIPYARD_REQUIRED_ENV } from "@repo/shared/env/require";
import { prisma, DeploymentStatus } from "@repo/db";
import { cloneRepo } from "./git/clone-repo";
import { buildInContainer } from "./build-in-container";
import { decryptProjectEnv } from "./env/project-env";
import { updateDeploymentStatus } from "./queries/deployment-status";

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

async function startWorker() {
  // A build that reaches the upload step with no bucket configured has already
  // burned minutes of container time for nothing.
  requireEnv(SHIPYARD_REQUIRED_ENV, "shipyard");

  await connectRedis();
  logger.info("Redis connected");

  // A build that was in flight when the worker last died is still parked on the
  // processing list — put it back on the queue instead of losing it.
  const recovered = await recoverStaleBuilds();
  if (recovered.length) {
    logger.warn({ recovered }, "Requeued orphaned deployments");
  }

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

      await setStatus(deployment.id, DeploymentStatus.CLONING);

      repoDir = await cloneRepo(deployment);
      log.info({ repoDir }, "Repo cloned");

      await setStatus(deployment.id, DeploymentStatus.BUILDING);

      // Decrypt here rather than inside the build so a bad key fails the
      // deployment with a clear message instead of a mid-build error.
      const envVars = decryptProjectEnv(deployment.project.envVars);

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
      );
      log.info("Build finished");

      await setStatus(deployment.id, DeploymentStatus.COMPLETED);
    } catch (error) {
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

import { Request, Response } from "express";
import { CANCELLABLE_STATUSES, QueueUnavailableError } from "@repo/shared";
import { deploymentService } from "../services/deployment.service";
import { projectService } from "../services/project.service";

/** GET /projects/:projectId/deployments */
export const listDeploymentsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const projectId = req.params.projectId!;
    const userId = req.user!.id;

    const project = await projectService.getOwnedProject(projectId, userId);
    if (!project) {
      return res
        .status(404)
        .json({ message: "Project not found", data: null, error: null });
    }

    const page = Math.max(1, Number(req.query.page ?? "1") || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit ?? "20") || 20),
    );

    const [deployments, total] = await deploymentService.listOwnedDeployments(
      projectId,
      userId,
      { skip: (page - 1) * limit, take: limit },
    );

    return res.status(200).json({
      message: "Fetched deployments successfully",
      data: deployments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      error: null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching deployments");
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/** POST /projects/:projectId/deployments — redeploy the project's current branch. */
export const redeployController = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId!;

    const project = await projectService.getOwnedProject(
      projectId,
      req.user!.id,
    );
    if (!project) {
      return res
        .status(404)
        .json({ message: "Project not found", data: null, error: null });
    }

    // Refuse to stack builds — one in-flight deployment per project at a time.
    const inFlight = project.deployments.find(
      (d) =>
        d.status === "QUEUED" ||
        d.status === "CLONING" ||
        d.status === "BUILDING",
    );
    if (inFlight) {
      return res.status(409).json({
        message: "A deployment for this project is already in progress",
        data: inFlight,
        error: null,
      });
    }

    const deployment = await deploymentService.queueDeployment(
      projectId,
      project.branch,
    );

    return res.status(201).json({
      message: "Deployment queued",
      data: deployment,
      error: null,
    });
  } catch (error) {
    if (error instanceof QueueUnavailableError) {
      return res.status(503).json({
        message:
          "Build queue is temporarily unavailable. Try again in a moment.",
        data: null,
        error: error.message,
      });
    }
    req.log.error({ err: error }, "Error queueing deployment");
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/** GET /deployments — cross-project activity feed. */
export const listAllDeploymentsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const userId = req.user!.id;
    const page = Math.max(1, Number(req.query.page ?? "1") || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit ?? "10") || 10),
    );
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = typeof req.query.status === "string" ? req.query.status : "";

    const [deployments, total] =
      await deploymentService.listAllOwnedDeployments(userId, {
        skip: (page - 1) * limit,
        take: limit,
        search,
        status,
      });

    return res.status(200).json({
      message: "Fetched deployments successfully",
      data: deployments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      error: null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching deployments feed");
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/** GET /deployments/:deploymentId */
export const getDeploymentController = async (req: Request, res: Response) => {
  try {
    const deployment = await deploymentService.getOwnedDeployment(
      req.params.deploymentId!,
      req.user!.id,
    );

    if (!deployment) {
      return res
        .status(404)
        .json({ message: "Deployment not found", data: null, error: null });
    }

    return res.status(200).json({
      message: "Fetched deployment successfully",
      data: deployment,
      error: null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching deployment");
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * GET /deployments/:deploymentId/logs
 * Pass `?after=<ISO timestamp>` to poll for only the lines you haven't seen.
 */
export const getDeploymentLogsController = async (
  req: Request,
  res: Response,
) => {
  try {
    const deploymentId = req.params.deploymentId!;
    const deployment = await deploymentService.getOwnedDeployment(
      deploymentId,
      req.user!.id,
    );

    if (!deployment) {
      return res
        .status(404)
        .json({ message: "Deployment not found", data: null, error: null });
    }

    const afterParam = req.query.after;
    let after: Date | undefined;
    if (typeof afterParam === "string" && afterParam) {
      const parsed = new Date(afterParam);
      if (Number.isNaN(parsed.getTime())) {
        return res.status(400).json({
          message: "`after` must be a valid ISO timestamp",
          data: null,
          error: null,
        });
      }
      after = parsed;
    }

    const limit = Math.min(
      1000,
      Math.max(1, Number(req.query.limit ?? "500") || 500),
    );

    const logs = await deploymentService.getLogs(deploymentId, {
      after,
      take: limit,
    });

    return res.status(200).json({
      message: "Fetched deployment logs successfully",
      data: {
        status: deployment.status,
        logs,
        // Cursor for the next poll; live clients should use the ws-server instead.
        cursor: logs.at(-1)?.timestamp ?? after ?? null,
      },
      error: null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching deployment logs");
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/** DELETE /deployments/:deploymentId */
export const deleteDeploymentController = async (
  req: Request,
  res: Response,
) => {
  try {
    const deploymentId = req.params.deploymentId!;
    const deployment = await deploymentService.getOwnedDeployment(
      deploymentId,
      req.user!.id,
    );

    if (!deployment) {
      return res
        .status(404)
        .json({ message: "Deployment not found", data: null, error: null });
    }

    await deploymentService.softDeleteDeployment(deploymentId);

    return res.status(200).json({
      message: "Deployment deleted",
      data: { id: deploymentId },
      error: null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error deleting deployment");
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/** POST /deployments/:deploymentId/cancel */
export const cancelDeploymentController = async (
  req: Request,
  res: Response,
) => {
  try {
    const deploymentId = req.params.deploymentId!;
    const deployment = await deploymentService.getOwnedDeployment(
      deploymentId,
      req.user!.id,
    );
    if (!deployment) {
      return res
        .status(404)
        .json({ message: "Deployment not found", data: null, error: null });
    }

    if (
      !(CANCELLABLE_STATUSES as readonly string[]).includes(deployment.status)
    ) {
      return res.status(409).json({
        message: `Deployment is already ${deployment.status.toLowerCase()}`,
        data: deployment,
        error: null,
      });
    }

    const cancelled = await deploymentService.cancelDeployment(deploymentId);

    return res.status(200).json({
      message: "Deployment cancelled",
      data: cancelled,
      error: null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error cancelling deployment");
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

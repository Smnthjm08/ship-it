import { Router, Request, Response } from "express";
import { isQueueReady } from "@repo/shared";
import authMiddleware from "../middlewares/auth.middleware";
import {
  createProjectLimiter,
  deploymentLimiter,
  githubSearchLimiter,
} from "../middlewares/rate-limit.middleware";
import {
  newProjectController,
  createProjectController,
} from "../controllers/new-project.controller";
import {
  listProjectsController,
  getProjectController,
  deleteProjectController,
} from "../controllers/project.controller";
import {
  listEnvVarsController,
  replaceEnvVarsController,
} from "../controllers/env-var.controller";
import {
  listDeploymentsController,
  redeployController,
  getDeploymentController,
  getDeploymentLogsController,
  deleteDeploymentController,
} from "../controllers/deployment.controller";

const v1Router: Router = Router();

// Reports dependencies rather than just liveness: the process being up while
// the build queue is down is exactly the state that used to go unnoticed.
v1Router.get("/health", (_req: Request, res: Response) => {
  const queue = isQueueReady();
  res.status(queue ? 200 : 503).json({
    status: queue ? "OK" : "DEGRADED",
    message: queue
      ? "healthy!"
      : "Redis is unreachable — builds cannot be queued",
    checks: { redis: queue ? "up" : "down" },
  });
});

// Repo search + project creation (the "import a repo" flow).
v1Router.get("/new", authMiddleware, githubSearchLimiter, newProjectController);
v1Router.post("/new", authMiddleware, createProjectLimiter, createProjectController);

// Projects
v1Router.get("/projects", authMiddleware, listProjectsController);
v1Router.get("/projects/:projectId", authMiddleware, getProjectController);
v1Router.delete(
  "/projects/:projectId",
  authMiddleware,
  deleteProjectController,
);

// Build-time environment variables scoped to a project
v1Router.get("/projects/:projectId/env", authMiddleware, listEnvVarsController);
v1Router.put(
  "/projects/:projectId/env",
  authMiddleware,
  replaceEnvVarsController,
);

// Deployments scoped to a project
v1Router.get(
  "/projects/:projectId/deployments",
  authMiddleware,
  listDeploymentsController,
);
v1Router.post(
  "/projects/:projectId/deployments",
  authMiddleware,
  deploymentLimiter,
  redeployController,
);

// Individual deployments
v1Router.get(
  "/deployments/:deploymentId",
  authMiddleware,
  getDeploymentController,
);
v1Router.get(
  "/deployments/:deploymentId/logs",
  authMiddleware,
  getDeploymentLogsController,
);
v1Router.delete(
  "/deployments/:deploymentId",
  authMiddleware,
  deleteDeploymentController,
);

export default v1Router;

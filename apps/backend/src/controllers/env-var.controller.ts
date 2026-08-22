import { Request, Response } from "express";
import { EnvVarValidationError, normalizeEnvVars } from "@repo/shared/env/vars";
import { envVarService } from "../services/env-var.service";
import { projectService } from "../services/project.service";

/** GET /projects/:projectId/env — keys only; values never leave the DB. */
export const listEnvVarsController = async (req: Request, res: Response) => {
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

    const envVars = await envVarService.listEnvVars(projectId);

    return res.status(200).json({
      message: "Fetched environment variables successfully",
      data: envVars,
      error: null,
    });
  } catch (error) {
    console.error("Error fetching environment variables:", error);
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// PUT /projects/:projectId/env — body is the complete desired set. Omit `value`
// to keep the stored secret, omit the key to delete it. Applies on next deploy.
export const replaceEnvVarsController = async (req: Request, res: Response) => {
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

    const desired = normalizeEnvVars(req.body?.envVars);
    const envVars = await envVarService.replaceEnvVars(projectId, desired);

    return res.status(200).json({
      message: "Environment variables saved. Redeploy to apply them.",
      data: envVars,
      error: null,
    });
  } catch (error) {
    if (error instanceof EnvVarValidationError) {
      return res
        .status(400)
        .json({ message: error.message, data: null, error: error.message });
    }
    console.error("Error saving environment variables:", error);
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

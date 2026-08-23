import { prisma } from "@repo/db";
import { Request, Response } from "express";
import {
  enqueueBuild,
  isQueueReady,
  QueueUnavailableError,
} from "@repo/shared";
import { EnvVarValidationError, normalizeEnvVars } from "@repo/shared/env/vars";
import {
  createProjectSchema,
  firstValidationError,
} from "@repo/shared/validation/project";
import { envVarService } from "../services/env-var.service";
import { branchSlug } from "@repo/shared/branch/slug";

export const createProjectController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = firstValidationError(parsed.error);
      return res.status(400).json({ message, data: null, error: message });
    }

    // Checked before the project row is written: creating a project whose first
    // build can never be queued is worse than refusing the request outright.
    if (!isQueueReady()) {
      return res.status(503).json({
        message:
          "Build queue is temporarily unavailable. Try again in a moment.",
        data: null,
        error: "Redis is not connected",
      });
    }

    const {
      name,
      repoUrl,
      project,
      owner,
      branch,
      framework,
      buildCommand,
      installCommand,
      rootDir,
      outputDir,
      envVars,
    } = parsed.data;

    // Validate before the write so a bad key can't create a half-configured
    // project whose first build is already queued.
    let envVarData: { key: string; value: string }[];
    try {
      envVarData = envVarService.buildCreateData(normalizeEnvVars(envVars));
    } catch (error) {
      if (error instanceof EnvVarValidationError) {
        return res
          .status(400)
          .json({ message: error.message, data: null, error: error.message });
      }
      throw error;
    }

    const newProject = await prisma.project.create({
      data: {
        name,
        repoUrl,
        repoName: project,
        owner,
        branch,
        framework,
        buildCommand,
        // The form sends these; without them the project silently falls back to
        // the schema defaults and ignores what the user typed.
        ...(installCommand && { installCommand }),
        ...(rootDir && { rootDir }),
        outputDir,
        userId,
        ...(envVarData.length && { envVars: { create: envVarData } }),
        deployments: {
          create: {
            status: "QUEUED",
            branch,
            branchSlug: branchSlug(branch),
          },
        },
      },
      include: {
        deployments: true,
      },
    });

    const deploymentId = newProject.deployments[0].id;

    // The project row is already committed, so a queue failure here can't be
    // undone by refusing the request — mark the deployment FAILED so it isn't
    // left QUEUED for a job nobody will run, and say so in the response.
    let queued = true;
    try {
      await enqueueBuild(deploymentId);
    } catch (error) {
      if (!(error instanceof QueueUnavailableError)) throw error;
      queued = false;
      await prisma.deployment
        .update({ where: { id: deploymentId }, data: { status: "FAILED" } })
        .catch(() => {});
    }

    res.status(201).json({
      message: queued
        ? "Project created successfully"
        : "Project created, but the build queue is unavailable — redeploy once it recovers.",
      data: newProject,
      error: null,
      res: newProject.deployments[0],
    });
  } catch (error) {
    req.log.error({ err: error }, "Error creating project");
    res.status(500).json({ message: "Internal server error" });
  }
};

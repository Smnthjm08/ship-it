import { Request, Response } from "express";
import { projectService } from "../services/project.service";
import {
  updateProjectSchema,
  firstValidationError,
} from "@repo/shared/validation/project";

export const listProjectsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const page = Math.max(1, Number(req.query.page ?? "1") || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(req.query.limit ?? "10") || 10),
    );
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const [projects, total] = await projectService.listProjects(userId, {
      skip: (page - 1) * limit,
      take: limit,
      search,
    });

    return res.status(200).json({
      message: "Fetched projects successfully",
      data: projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      error: null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching projects");
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getProjectController = async (req: Request, res: Response) => {
  try {
    const project = await projectService.getOwnedProject(
      req.params.projectId!,
      req.user!.id,
    );

    if (!project) {
      return res
        .status(404)
        .json({ message: "Project not found", data: null, error: null });
    }

    return res.status(200).json({
      message: "Fetched project successfully",
      data: project,
      error: null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching project");
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const deleteProjectController = async (req: Request, res: Response) => {
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

    await projectService.softDeleteProject(projectId);

    return res.status(200).json({
      message: "Project deleted",
      data: { id: projectId },
      error: null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error deleting project");
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * PATCH /projects/:projectId
 *
 * Patch semantics: only the fields the client sent are written, so the general
 * and build-settings forms save independently without clobbering each other.
 */
export const updateProjectController = async (req: Request, res: Response) => {
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

    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = firstValidationError(parsed.error);
      return res.status(400).json({ message, data: null, error: message });
    }

    if (Object.keys(parsed.data).length === 0) {
      return res.status(400).json({
        message: "No fields to update",
        data: null,
        error: "No fields to update",
      });
    }

    const updated = await projectService.updateProject(projectId, parsed.data);

    return res.status(200).json({
      message: "Project updated successfully",
      data: updated,
      error: null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error updating project");
    return res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

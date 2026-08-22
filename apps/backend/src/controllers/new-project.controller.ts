import { prisma } from "@repo/db";
import { Request, Response } from "express";
import { Octokit } from "octokit";

export const newProjectController = async (req: Request, res: Response) => {
  try {
    const searchParams = req.query;
    const account = await prisma.account.findFirst({
      where: {
        userId: req?.user?.id,
      },
    });

    if (!account) {
      return res.status(404).json({
        message: "Account not found",
        data: null,
        error: null,
      });
    }

    const octokit = new Octokit({ auth: account?.accessToken });

    const query = searchParams?.q;
    const search = typeof query === "string" ? query.trim() : "";
    const page = Number(searchParams?.page ?? "1");
    const per_page = Number(searchParams?.per_page ?? "5");

    let repos: unknown[] = [];

    if (search) {
      const { data: authUser } = await octokit.request("GET /user");
      const login = authUser.login;

      const q = `${search} in:name user:${login}`;

      const searchRes = await octokit.request("GET /search/repositories", {
        q,
        page,
        per_page,
        order: "asc",
        sort: "updated",
      });

      repos = searchRes.data.items;
    } else {
      const res = await octokit.request("GET /user/repos/", {
        page,
        per_page,
        order: "desc",
        sort: "updated",
      });
      repos = res.data;
    }

    const cleanRepos = repos.map((repo: any) => {
      const techStack: string[] = [];

      if (repo.language) techStack.push(repo.language);
      if (repo.topics?.includes("nextjs")) techStack.push("Next.js");
      // Fix: includes() only takes one argument at a time
      if (repo.topics?.includes("react") || repo.topics?.includes("reactjs")) {
        techStack.push("React.js");
      }

      return {
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        visibility: repo.visibility,
        owner: repo.owner.login,
        description: repo.description,
        updatedAt: repo.updated_at,
        size: repo.size,
        defaultBranch: repo.default_branch,
        language: repo.language,
        topics: repo.topics,
        url: repo.html_url,
        techStack,
      };
    });

    return res.status(200).json({
      message: "Fetched github repository successfully",
      data: cleanRepos,
      error: null,
    });
  } catch (error) {
    req.log.error({ err: error }, "Error fetching github repository");
    res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

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

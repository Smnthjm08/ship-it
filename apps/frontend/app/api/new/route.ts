import { NextResponse, NextRequest } from "next/server";
import prisma from "@workspace/db";
import { auth } from "@workspace/shared/auth";
import { headers } from "next/headers";
import { redisQueue } from "@workspace/shared/redis/queue";

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      repo,
      branch,
      name,
      framework,
      rootDir,
      buildCommand,
      outputDir,
      installCommand,
    } = body;

    if (!repo || typeof repo !== "string" || !repo.includes("/")) {
      return NextResponse.json(
        { error: "Invalid repo format. Expected 'owner/repo'" },
        { status: 400 },
      );
    }

    const [owner, repoName] = repo.split("/");

    const _owner = owner ?? "";
    const _repoName = repoName ?? "";

    const [project, deployment] = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name,
          repoUrl: `https://github.com/${repo}`,
          owner: _owner,
          repoName: _repoName,
          branch,
          framework,
          rootDir,
          installCommand,
          buildCommand,
          outputDir,
          userId: session.user.id,
        },
      });

      const deployment = await tx.deployment.create({
        data: {
          projectId: project.id,
          status: "queued",
        },
      });

      return [project, deployment];
    });

    const queue = await redisQueue.lPush("deployment-id", deployment?.id);

    return NextResponse.json({ project, deployment, queue }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);

    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}

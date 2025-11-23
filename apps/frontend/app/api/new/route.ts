import { NextResponse } from "next/server";
import prisma from "@workspace/db";
import { auth } from "@workspace/shared/auth";
import { headers } from "next/headers";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

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

    const [owner, repoName] = repo.split("/");

    const project = await prisma.project.create({
      data: {
        name,
        repoUrl: `https://github.com/${repo}`,
        owner,
        repoName,
        branch,
        framework,
        rootDir,
        installCommand,
        buildCommand,
        outputDir,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 },
    );
  }
}

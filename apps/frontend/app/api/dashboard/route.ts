import { NextResponse, NextRequest } from "next/server";
import prisma from "@workspace/db";
import { headers } from "next/headers";
import { auth } from "@workspace/shared/auth";
import { Octokit } from "octokit";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    // const gitHubInstallation = await prisma.gitHubInstallation.findMany({
    //   where: { userId },
    // });

    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const token = accounts?.[0]?.accessToken;
    if (!token) {
      return NextResponse.json(
        { error: "GitHub account not connected" },
        { status: 400 },
      );
    }

    const octokit = new Octokit({ auth: token });

    const search = searchParams.get("query")?.trim() ?? "";
    const page = Number(searchParams.get("page") ?? "1");
    const per_page = Number(searchParams.get("per_page") ?? "10");

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
      if (repo.topics?.includes("react", "reactjs")) techStack.push("React.js");

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
        techStack,
      };
    });

    return NextResponse.json({
      projects,
      repos: cleanRepos,
    });
  } catch (error) {
    console.error("Error fetching dashboard details:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

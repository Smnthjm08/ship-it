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

    const query = searchParams?.query;
    const search = typeof query === "string" ? query.trim() : "";
    const page = Number(searchParams?.page ?? "1");
    const per_page = Number(searchParams?.per_page ?? "10");

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
    console.error("Error fetching github repository:", error);
    res.status(500).json({
      message: "Internal server error",
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

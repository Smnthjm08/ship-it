import { cookies } from "next/headers";
import { GitHubInstallation, Project } from "@/types/types";
import ProjectsSection from "@/components/dashboard/projects-card";
import GitHubSection from "@/components/dashboard/github-card";

export const dynamic = "force-dynamic";

interface DashboardData {
  projects: Project[];
  github: GitHubInstallation[];
}

export default async function DashboardPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  const cookieStore = await cookies();

  const res = await fetch(`${baseUrl}/api/dashboard`, {
    cache: "no-store",
    headers: {
      Cookie: cookieStore.toString(),
    },
  });

  if (!res.ok) {
    console.error(
      "Failed to fetch dashboard data",
      res.status,
      await res.text(),
    );
    return <div>Error loading dashboard</div>;
  }

  const data: DashboardData = await res.json();

  return (
    <div className="min-h-[calc(100vh-64px)] py--6 lg:py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-400 text-md mt-2">
            Manage your Projects and GitHub integrations
          </p>
        </div>

        <div className="flex gap-12 justify-between">
          <div className="flex-1/3">
            <GitHubSection installations={data.github} />
          </div>
          <div className="flex-2/3">
            <ProjectsSection
              projects={data.projects}
              hasGitHubConnection={data.github.length > 0}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

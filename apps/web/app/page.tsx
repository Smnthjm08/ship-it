import { Button } from "@/components/ui/button";
import { auth } from "@repo/auth/server";
import { headers } from "next/headers";
import Link from "next/link";
import type { AuthSession } from "@/types/session";
import { getServerAxios } from "@/lib/axios-instance";
import { Input } from "@/components/ui/input";
import { PlusCircle } from "lucide-react";
import ProjectsCard, { ProjectTypes } from "@/components/projects-card";
import { EmptyProjects } from "@/components/empty-projects";

export default async function HomePage() {
  const session = (await auth.api.getSession({
    headers: await headers(),
  })) as AuthSession | null;

  const axiosInstance = await getServerAxios();
  const projects = await axiosInstance.get("/projects");

  if (session) {
    return (
      <main className="flex flex-col justify-between py-6 px-12 gap-4 lg:px-24">
        <h1 className="text-2xl font-bold">Welcome, {session?.user?.name}!</h1>

        <div className="flex space-x-4">
          <Input placeholder="Search Projects..." />
          <Link href="/new">
            <Button>
              New Project <PlusCircle />
            </Button>
          </Link>
        </div>

        {projects.data?.data.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.data?.data.map((project: ProjectTypes) => (
              <ProjectsCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <div className="flex justify-center items-center">
            <EmptyProjects />
          </div>
        )}
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-screen items-center justify-center gap-2">
      <h1 className="font-extrabold text-xl">ShipIt</h1>
      <Button asChild>
        <Link href={"/connect-github"}>Connect Github</Link>
      </Button>
    </main>
  );
}
